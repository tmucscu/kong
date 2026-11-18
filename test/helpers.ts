import { env } from "cloudflare:workers";
import { InteractionType } from "../src/discord/constants";
import { createApp, type AppDeps } from "../src/app";

const keyPair = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
const publicKeyHex = hex(new Uint8Array((await crypto.subtle.exportKey("raw", keyPair.publicKey)) as ArrayBuffer));

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sign(body: string, timestamp = String(Math.floor(Date.now() / 1000))) {
  const data = new TextEncoder().encode(timestamp + body);
  const sig = await crypto.subtle.sign("Ed25519", keyPair.privateKey, data);
  return { timestamp, signature: hex(new Uint8Array(sig)) };
}

/** Sends a correctly signed interaction to the Worker's fetch handler, as Discord would. */
export async function send(payload: object, deps?: Partial<AppDeps>) {
  const body = JSON.stringify(payload);
  const { timestamp, signature } = await sign(body);
  const app = createApp(deps);
  const response = await app.fetch(
    new Request("https://kong.test/interactions", {
      method: "POST",
      headers: { "x-signature-ed25519": signature, "x-signature-timestamp": timestamp, "content-type": "application/json" },
      body,
    }),
    { ...env, DISCORD_PUBLIC_KEY: publicKeyHex },
  );
  return response;
}

export const ping = { type: InteractionType.Ping };

export interface Reply {
  type: number;
  data?: {
    content?: string;
    flags?: number;
    embeds?: { title?: string; description?: string }[];
    allowed_mentions?: { parse?: string[] };
    components?: { components: { custom_id: string; options: { label: string; value: string }[] }[] }[];
    choices?: { name: string; value: number }[];
  };
}

/** A slash command invocation by `userId`, optionally with Manage Server. */
export function command(name: string, opts: { userId?: string; admin?: boolean; options?: object[] } = {}) {
  return {
    type: 2,
    id: "1",
    token: "token",
    application_id: "app",
    guild_id: "guild",
    member: { user: { id: opts.userId ?? "100" }, permissions: opts.admin ? String(1n << 5n) : "0" },
    data: { id: "c", name, type: 1, options: opts.options ?? [] },
  };
}

export async function reply(response: Response): Promise<Reply> {
  return (await response.json()) as Reply;
}

/** 2026-11-18 12:00 in Toronto (EST, UTC-5). */
export const NOW = () => new Date("2026-11-18T17:00:00Z");

export async function seedBooking(b: {
  userId: string;
  date: string;
  start: string;
  end: string;
  othersCanCome?: boolean;
  reason?: string;
}) {
  await env.DB.prepare(
    "INSERT INTO bookings (user_id, date, start, end, reason, others_can_come) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(b.userId, b.date, b.start, b.end, b.reason ?? null, b.othersCanCome ? 1 : 0)
    .run();
}

/** A `/taco <subcommand>` invocation. `users` are the Members picked in user1..user5. */
export function taco(
  subcommand: string,
  opts: { from?: string; admin?: boolean; users?: string[]; bots?: string[]; reason?: string; extra?: object[] } = {},
) {
  const picked = [...(opts.users ?? []), ...(opts.bots ?? [])];
  const options: object[] = picked.map((id, i) => ({ name: `user${i + 1}`, type: 6, value: id }));
  if (opts.reason !== undefined) options.push({ name: "reason", type: 3, value: opts.reason });
  options.push(...(opts.extra ?? []));

  const base = command("taco", { userId: opts.from, admin: opts.admin });
  return {
    ...base,
    data: {
      ...base.data,
      options: [{ name: subcommand, type: 1, options }],
      resolved: {
        users: Object.fromEntries([
          ...(opts.users ?? []).map((id) => [id, { id, bot: false }]),
          ...(opts.bots ?? []).map((id) => [id, { id, bot: true }]),
        ]),
      },
    },
  };
}

export const userOption = (name: string, value: string) => ({ name, type: 6, value });
export const intOption = (name: string, value: number) => ({ name, type: 4, value });
export const stringOption = (name: string, value: string) => ({ name, type: 3, value });

/** A clock fixed at noon Toronto time on the given "YYYY-MM-DD" day. */
export const on = (day: string) => () => new Date(`${day}T17:00:00Z`);

/** A `/taco history` invocation. */
export const history = (user: string, opts: { season?: number; from?: string } = {}) =>
  taco("history", {
    from: opts.from,
    extra: [userOption("user", user), ...(opts.season === undefined ? [] : [intOption("season", opts.season)])],
  });

/** An autocomplete interaction (type 4) for the focused `season` option of a `/taco` subcommand. */
export function seasonAutocomplete(subcommand: string, typed = "") {
  const base = command("taco");
  return {
    ...base,
    type: 4,
    data: {
      ...base.data,
      options: [{ name: subcommand, type: 1, options: [{ name: "season", type: 4, value: typed, focused: true }] }],
    },
  };
}

/** A string-select choice made on a message (component_type 3). */
export function selectChoice(customId: string, values: string[], opts: { userId?: string; admin?: boolean } = {}) {
  return {
    type: 3,
    id: "2",
    token: "token",
    application_id: "app",
    guild_id: "guild",
    member: { user: { id: opts.userId ?? "100" }, permissions: opts.admin ? String(1n << 5n) : "0" },
    message: { id: "m", flags: 64 },
    data: { custom_id: customId, component_type: 3, values },
  };
}
