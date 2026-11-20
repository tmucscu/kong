import { NOW, intOption, reply, send, taco } from "./helpers";

const board = () => send(taco("leaderboard"), { now: NOW });

const give = (from: string, users: string[], reason: string, bots: string[] = []) =>
  send(taco("give", { from, users, reason, bots }), { now: NOW });

describe("/taco give", () => {
  it("announces publicly who gave a taco to whom and why", async () => {
    const body = await reply(await give("100", ["200"], "helped set up the office"));

    expect(body.data?.content).toBe("<@100> gave a 🌮 to <@200> because they helped set up the office 👏👏");
    expect(body.data?.flags ?? 0).toBe(0);
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
  });
});

describe("/taco give rules", () => {
  it("posts one message when several members get a taco at once", async () => {
    const body = await reply(await give("100", ["200", "201", "202"], "ran the workshop"));

    expect(body.data?.content).toBe("<@100> gave a 🌮 to <@200>, <@201>, <@202> because they ran the workshop 👏👏");
  });

  it("will not let you give yourself a taco, even alongside others", async () => {
    const body = await reply(await give("100", ["100", "200"], "was great"));

    expect(body.data?.content).toBe("You cannot give yourself a taco!");
    expect(body.data?.flags).toBe(64);
    expect((await reply(await board())).data?.embeds?.[0]?.description).toBe("No tacos yet this season!");
  });

  it("will not give a taco to a bot", async () => {
    const body = await reply(await give("100", ["200"], "was great", ["999"]));

    expect(body.data?.content).toBe("Bots can't receive tacos!");
    expect(body.data?.flags).toBe(64);
    expect((await reply(await board())).data?.embeds?.[0]?.description).toBe("No tacos yet this season!");
  });

  it("counts a member once when they are picked twice in the same command", async () => {
    await give("100", ["200", "200"], "was great");

    expect((await reply(await board())).data?.embeds?.[0]?.description).toBe("🥇 <@200> - 1");
  });
});

describe("/taco leaderboard", () => {
  it("says so when nobody has been given a taco yet", async () => {
    const body = await reply(await board());

    expect(body.data?.embeds?.[0]?.title).toBe("🌮 Tacos: Season 1");
    expect(body.data?.embeds?.[0]?.description).toBe("No tacos yet this season!");
  });

  it("answers an unknown Season number with an ephemeral, friendly message", async () => {
    const body = await reply(await send(taco("leaderboard", { extra: [intOption("season", 9)] }), { now: NOW }));

    expect(body.data?.content).toBe("There is no Season 9. Pick one from the list.");
    expect(body.data?.flags).toBe(64);
  });

  it("ranks members by tacos received, with medals for the top three", async () => {
    await give("100", ["200"], "did a");
    await give("101", ["200", "201"], "did b");
    await give("102", ["200", "201", "202"], "did c");
    await give("100", ["203"], "did d");

    const body = await reply(await board());

    expect(body.data?.embeds?.[0]?.description).toBe(
      ["🥇 <@200> - 3", "🥈 <@201> - 2", "🥉 <@202> - 1", "=====", "04. <@203> - 1"].join("\n"),
    );
    expect(body.data?.allowed_mentions).toEqual({ parse: [] });
  });
});
