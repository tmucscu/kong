import { history, on, reply, seasonAutocomplete, send, taco } from "./helpers";

const give = (day: string, from: string, users: string[], reason: string) =>
  send(taco("give", { from, users, reason }), { now: on(day) });

const view = async (user: string, season?: number) =>
  reply(await send(history(user, { season }), { now: on("2026-11-18") }));

describe("season autocomplete", () => {
  it("offers the existing Seasons by number", async () => {
    const body = await reply(await send(seasonAutocomplete("history"), { now: on("2026-11-18") }));

    expect(body.type).toBe(8);
    expect(body.data?.choices).toEqual([{ name: "Season 1", value: 1 }]);
  });
});

describe("/taco history", () => {
  it("lists a Member's Tacos for the current Season, newest first, with date, reason and giver", async () => {
    await give("2026-11-10", "101", ["200"], "fixed the printer");
    await give("2026-11-17", "102", ["200"], "ran the workshop");
    await give("2026-11-17", "101", ["201"], "someone else's taco");

    const body = await view("200");

    expect(body.data?.embeds?.[0]?.title).toBe("🌮 Tacos for Season 1");
    expect(body.data?.embeds?.[0]?.description).toBe(
      ["2026-11-17: ran the workshop from <@102>", "2026-11-10: fixed the printer from <@101>"].join("\n"),
    );
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
  });

  it("truncates to fit Discord's embed limit and says how many Tacos were left out", async () => {
    for (let i = 0; i < 30; i++) await give("2026-11-17", "101", ["200"], `${i}`.padStart(3, "0") + "x".repeat(197));

    const description = (await view("200")).data?.embeds?.[0]?.description ?? "";
    const lines = description.split("\n");
    const more = Number(lines.at(-1)!.match(/^…and (\d+) more$/)?.[1]);

    expect(description.length).toBeLessThanOrEqual(4096);
    expect(more).toBeGreaterThan(0);
    expect(lines.length - 1 + more).toBe(30);
  });

  it("answers an unknown Season number with an ephemeral, friendly message", async () => {
    const body = await view("200", 7);

    expect(body.data?.content).toBe("There is no Season 7. Pick one from the list.");
    expect(body.data?.flags).toBe(64);
  });

  it("shows the current Season when asked for it by number", async () => {
    await give("2026-11-17", "101", ["200"], "ran the workshop");

    const body = await view("200", 1);

    expect(body.data?.embeds?.[0]?.description).toBe("2026-11-17: ran the workshop from <@101>");
  });

  it("says so clearly when a Member has no Tacos this Season", async () => {
    await give("2026-11-17", "101", ["201"], "someone else's taco");

    const body = await view("200");

    expect(body.data?.content).toBe("<@200> has no tacos this season");
    expect(body.data?.embeds).toBeUndefined();
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
  });
});
