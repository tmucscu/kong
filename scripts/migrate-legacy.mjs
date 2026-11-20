import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { timeIn, todayIn } from "../src/time.ts";

const timeZone = "America/Toronto";
const snowflake = /^[1-9]\d{16,19}$/;
const normalize = (name) => name.trim().toLowerCase();

async function readJson(directory, file) {
  return JSON.parse(await readFile(join(directory, file), "utf8"));
}

async function listMembers() {
  const { DISCORD_GUILD_ID: guildId, DISCORD_BOT_TOKEN: token } = process.env;
  if (!snowflake.test(guildId ?? "") || !token) {
    throw new Error("Set DISCORD_GUILD_ID and DISCORD_BOT_TOKEN to fetch the CSCU member list.");
  }

  const members = [];
  let after = "0";
  while (true) {
    const url = new URL(`https://discord.com/api/v10/guilds/${guildId}/members`);
    url.search = new URLSearchParams({ limit: "1000", after });
    const response = await fetch(url, { headers: { authorization: `Bot ${token}` } });
    if (!response.ok) throw new Error(`Discord member list request failed (HTTP ${response.status}).`);
    const page = await response.json();
    members.push(...page);
    if (page.length < 1000) return members;
    after = page.at(-1).user.id;
  }
}

function indexNames(roster, discordMembers) {
  const names = new Map();
  const add = (id, name) => {
    if (!snowflake.test(id) || !name?.trim()) return;
    const key = normalize(name);
    if (!names.has(key)) names.set(key, new Set());
    names.get(key).add(id);
  };

  for (const role of Object.values(roster)) {
    for (const [id, name] of Object.entries(role)) add(id, name);
  }
  for (const { nick, user } of discordMembers) {
    add(user.id, nick || user.username);
    add(user.id, user.global_name);
  }
  return names;
}

function legacyDate(value) {
  const match = /^(\d{2})([/-])(\d{2})\2(\d{4})$/.exec(value);
  if (!match) throw new Error(`Invalid legacy date: ${value}`);
  const [, month, , day, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== iso) {
    throw new Error(`Invalid legacy date: ${value}`);
  }
  return iso;
}

function legacyBookings(data, today, currentTime) {
  const bookings = [];
  let expired = 0;
  for (const [value, rows] of Object.entries(data)) {
    const date = legacyDate(value);
    for (const row of rows) {
      if (date < today || (date === today && row.end <= currentTime)) {
        expired++;
        continue;
      }
      const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
      if (!time.test(row.start) || !(time.test(row.end) || row.end === "24:00") || row.start >= row.end) {
        throw new Error(`Invalid legacy booking times for ${date}.`);
      }
      bookings.push({ ...row, date });
    }
  }
  bookings.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return { bookings, expired };
}

function makePlan({ bookings, tacos, names, matches }) {
  const unmatched = new Map();
  const resolve = (name, kind) => {
    const key = normalize(name);
    if (matches.has(key)) return matches.get(key);
    const candidates = names.get(key) ?? new Set();
    if (candidates.size === 1) {
      const id = candidates.values().next().value;
      matches.set(key, id);
      return id;
    }
    if (!unmatched.has(key)) {
      unmatched.set(key, { name, bookings: 0, tacos: 0, candidates: [...candidates].sort(), userId: null });
    }
    unmatched.get(key)[kind]++;
    return null;
  };

  const matchedBookings = [];
  for (const booking of bookings) {
    const userId = resolve(booking.name, "bookings");
    if (userId) matchedBookings.push({ ...booking, userId });
  }

  const matchedTacos = [];
  for (const taco of tacos) {
    const giverId = resolve(taco.giver, "tacos");
    const recipientId = normalize(taco.giver) === normalize(taco.recipient)
      ? giverId
      : resolve(taco.recipient, "tacos");
    if (giverId && recipientId) matchedTacos.push({ ...taco, giverId, recipientId });
  }
  return { matchedBookings, matchedTacos, unmatched: [...unmatched.values()] };
}

// Encode legacy text as UTF-8 SQL literals so quotes and control characters round-trip.
const sqlText = (value) => value == null ? "NULL" : `CAST(X'${Buffer.from(value).toString("hex")}' AS TEXT)`;

function importSql(bookings, tacos, today) {
  for (let index = 1; index < bookings.length; index++) {
    const previous = bookings[index - 1];
    const next = bookings[index];
    if (next.date === previous.date && next.start < previous.end) {
      throw new Error(`Overlapping bookings on ${next.date} at ${next.start}. Resolve the overlap in the export before importing.`);
    }
  }

  const seasonStart = tacos.reduce((earliest, taco) => taco.date < earliest ? taco.date : earliest, today);
  return [
    // Refuse to import twice or into a database with live data. An empty, open Season 1 is allowed.
    "INSERT INTO seasons (number, started_at) SELECT NULL, 'blocked' WHERE EXISTS (SELECT 1 FROM bookings) OR EXISTS (SELECT 1 FROM tacos) OR EXISTS (SELECT 1 FROM seasons WHERE number <> 1 OR ended_at IS NOT NULL);",
    `INSERT INTO seasons (number, started_at) VALUES (1, ${sqlText(seasonStart)}) ON CONFLICT(number) DO UPDATE SET started_at = MIN(seasons.started_at, excluded.started_at);`,
    ...bookings.map((row) => {
      const values = [row.userId, row.date, row.start, row.end, row.reason].map(sqlText);
      return `INSERT INTO bookings (user_id, date, start, end, reason, others_can_come) VALUES (${values.join(", ")}, ${row.canOthersCome === true ? 1 : 0});`;
    }),
    ...tacos.map((row) => {
      const values = [row.giverId, row.recipientId, row.reason, row.date].map(sqlText);
      return `INSERT INTO tacos (season_id, giver_id, recipient_id, reason, date) SELECT id, ${values.join(", ")} FROM seasons WHERE number = 1;`;
    }),
  ].join("\n") + "\n";
}

async function main() {
  const [mode, directory = "legacy-data", memberFile] = process.argv.slice(2);
  if ((mode !== "report" && mode !== "import") || (mode === "import" && memberFile)) {
    throw new Error("Usage: pnpm migrate:legacy <report|import> [data-directory] [discord-members-json]");
  }

  const now = new Date();
  const today = todayIn(timeZone, now);
  const [legacyBookingData, legacyTacoData] = await Promise.all([
    readJson(directory, "bookings.json"),
    readJson(directory, "tacos.json"),
  ]);
  const { bookings, expired } = legacyBookings(legacyBookingData, today, timeIn(timeZone, now));
  const tacos = Object.entries(legacyTacoData).flatMap(([recipient, rows]) =>
    rows.slice().reverse().map((row) => ({ ...row, recipient, date: legacyDate(row.date) })),
  );

  const matches = new Map();
  let names = new Map();
  if (mode === "report") {
    const [roster, members] = await Promise.all([
      readJson(directory, "members.json"),
      memberFile ? readFile(memberFile, "utf8").then(JSON.parse) : listMembers(),
    ]);
    names = indexNames(roster, members);
  } else {
    const report = await readJson(directory, "unmatched.json");
    const resolved = Object.entries(report.matches).map(([name, userId]) => ({ name, userId }));
    for (const { name, userId } of [...resolved, ...report.unmatched]) {
      if (userId == null || userId === "") continue;
      if (typeof userId !== "string" || !snowflake.test(userId)) {
        throw new Error("Each resolved userId in unmatched.json must be a Discord snowflake string.");
      }
      const key = normalize(name);
      if (matches.has(key) && matches.get(key) !== userId) throw new Error("Conflicting user IDs in unmatched.json.");
      matches.set(key, userId);
    }
  }

  const { matchedBookings, matchedTacos, unmatched } = makePlan({
    bookings, tacos, names, matches,
  });
  if (mode === "report") {
    unmatched.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));
    const report = { matches: Object.fromEntries(matches), unmatched };
    await writeFile(join(directory, "unmatched.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  } else {
    await writeFile(join(directory, "import.sql"), importSql(matchedBookings, matchedTacos, today), { flag: "wx", mode: 0o600 });
  }
  const label = mode === "report" ? "matched" : "ready to import";
  console.log(`Bookings: ${matchedBookings.length} ${label}, ${bookings.length - matchedBookings.length} unmatched, ${expired} expired.`);
  console.log(`Tacos: ${matchedTacos.length} ${label}, ${tacos.length - matchedTacos.length} unmatched.`);
  console.log(mode === "report" ? "Review unmatched.json." : "Generated import.sql. Unmatched records are excluded.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
