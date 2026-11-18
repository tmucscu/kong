import { history, on, reply, selectChoice, send, stringOption, taco, tacoAdmin, userOption } from "./helpers";

const day = "2026-11-18";
const give = (from: string, users: string[], reason: string, at = day) =>
  send(taco("give", { from, users, reason }), { now: on(at) });
const board = async (at = day) => reply(await send(taco("leaderboard"), { now: on(at) }));
const newSeason = (name?: string, at = day) =>
  send(tacoAdmin("new-season", { admin: true, options: name ? [stringOption("name", name)] : [] }), { now: on(at) });

const removeMenu = (user: string, opts: { admin?: boolean; at?: string } = {}) =>
  send(tacoAdmin("remove", { admin: opts.admin ?? true, options: [userOption("user", user)] }), { now: on(opts.at ?? day) });

describe("/taco-admin remove", () => {
  it("shows an Admin only a private select of that Member's current Season Tacos, newest first", async () => {
    await give("101", ["200"], "fixed the printer", "2026-11-10");
    await give("102", ["200"], "ran the workshop", "2026-11-17");
    await give("101", ["201"], "someone else's taco", "2026-11-17");

    const body = await reply(await removeMenu("200"));
    const select = body.data?.components?.[0]?.components[0];

    expect(body.data?.flags).toBe(64);
    expect(select?.custom_id).toBe("taco-remove");
    expect(select?.options.map((o: { label: string }) => o.label)).toEqual(["2026-11-17: ran the workshop", "2026-11-10: fixed the printer"]);
    expect(body.data?.content).toContain("2026-11-17: ran the workshop from <@102>");
    expect(body.data?.content).toContain("2026-11-10: fixed the printer from <@101>");
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
  });
});

describe("/taco-admin remove limits", () => {
  it("is refused for a Member who is not an Admin", async () => {
    await give("101", ["200"], "fixed the printer");

    const body = await reply(await removeMenu("200", { admin: false }));

    expect(body.data?.content).toBe("Only admins can do that.");
    expect(body.data?.flags).toBe(64);
    expect(body.data?.components).toBeUndefined();
  });

  it("says so when the Member has no Tacos this Season, even if they had some in a past Season", async () => {
    await give("101", ["200"], "fixed the printer", "2026-11-10");
    await newSeason(undefined, "2026-11-12");

    const body = await reply(await removeMenu("200", { at: "2026-11-13" }));

    expect(body.data?.content).toBe("<@200> has no tacos this season");
    expect(body.data?.components).toBeUndefined();
  });

  it("offers at most the 25 newest Tacos, with labels that fit Discord's 100 character limit", async () => {
    for (let i = 1; i <= 27; i++) await give("101", ["200"], "x".repeat(200), `2026-10-${String(i).padStart(2, "0")}`);

    const options = (await reply(await removeMenu("200"))).data!.components![0].components[0].options;

    expect(options).toHaveLength(25);
    expect(options[0].label.startsWith("2026-10-27:")).toBe(true);
    expect(options.every((o: { label: string }) => o.label.length <= 100)).toBe(true);
  });
});

const choose = async (user: string, index: number, who: { userId?: string; admin?: boolean } = { admin: true }) => {
  const menu = await reply(await removeMenu(user));
  const select = menu.data!.components![0].components[0];
  return send(selectChoice(select.custom_id, [select.options[index].value], who), { now: on(day) });
};

describe("removing a taco from the select", () => {
  it("deletes the chosen Taco and announces it publicly without pinging anyone", async () => {
    await give("101", ["200"], "fixed the printer", "2026-11-10");
    await give("102", ["200"], "ran the workshop", "2026-11-17");

    const body = await reply(await choose("200", 0));

    expect(body.data?.content).toBe("An admin removed a taco from <@200>");
    expect(body.data?.flags ?? 0).toBe(0);
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
    expect((await board()).data?.embeds?.[0]?.description).toBe("🥇 <@200> - 1");
    const left = await reply(await send(history("200"), { now: on(day) }));
    expect(left.data?.embeds?.[0]?.description).toBe("2026-11-10: fixed the printer from <@101>");
  });

  it("answers a Taco that was already removed with an ephemeral, friendly message", async () => {
    await give("101", ["200"], "fixed the printer", "2026-11-10");
    const menu = await reply(await removeMenu("200"));
    const select = menu.data!.components![0].components[0];
    const pick = () => send(selectChoice(select.custom_id, [select.options[0].value], { admin: true }), { now: on(day) });
    await pick();

    const body = await reply(await pick());

    expect(body.data?.content).toBe("That taco was already removed.");
    expect(body.data?.flags).toBe(64);
  });

  it("refuses a replayed selection from a non-Admin and the Taco is still counted", async () => {
    await give("101", ["200"], "fixed the printer", "2026-11-10");
    const menu = await reply(await removeMenu("200"));
    const select = menu.data!.components![0].components[0];

    const body = await reply(
      await send(selectChoice(select.custom_id, [select.options[0].value], { userId: "666" }), { now: on(day) }),
    );

    expect(body.data?.content).toBe("Only admins can do that.");
    expect(body.data?.flags).toBe(64);
    expect((await board()).data?.embeds?.[0]?.description).toBe("🥇 <@200> - 1");
  });
});

describe("/taco-admin new-season", () => {
  it("starts the next Season, announces it publicly, and the leaderboard starts empty", async () => {
    await give("100", ["200"], "helped out");

    const body = await reply(await newSeason("Winter 2027"));

    expect(body.data?.content).toBe("Season 2 (Winter 2027) has started! Season 1 is archived.");
    expect(body.data?.flags ?? 0).toBe(0);
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });

    const after = await board();
    expect(after.data?.embeds?.[0]?.title).toBe("🌮 Tacos: Season 2");
    expect(after.data?.embeds?.[0]?.description).toBe("No tacos yet this season!");
  });

  it("numbers consecutive Seasons and lets the name be omitted", async () => {
    await newSeason();
    const body = await reply(await newSeason("Fall"));

    expect(body.data?.content).toBe("Season 3 (Fall) has started! Season 2 is archived.");
  });

  it("is refused for a Member who is not an Admin, and no Season starts", async () => {
    const body = await reply(await send(tacoAdmin("new-season"), { now: on(day) }));

    expect(body.data?.content).toBe("Only admins can do that.");
    expect(body.data?.flags).toBe(64);
    expect((await board()).data?.embeds?.[0]?.title).toBe("🌮 Tacos: Season 1");
  });
});
