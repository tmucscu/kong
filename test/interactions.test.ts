import { env } from "cloudflare:workers";
import { InteractionResponseType } from "../src/discord/constants";
import { createApp } from "../src/app";
import { ping, send, sign } from "./helpers";

describe("interactions endpoint", () => {
  it("answers Discord's ping with a pong", async () => {
    const response = await send(ping);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ type: InteractionResponseType.Pong });
  });

  it("rejects a request whose signature does not match the body", async () => {
    const { timestamp, signature } = await sign(JSON.stringify(ping));
    const tampered = JSON.stringify({ ...ping, type: 2 });

    const response = await createApp().fetch(
      new Request("https://kong.test/interactions", {
        method: "POST",
        headers: { "x-signature-ed25519": signature, "x-signature-timestamp": timestamp },
        body: tampered,
      }),
      env,
    );

    expect(response.status).toBe(401);
  });

  it("rejects a request with no signature headers", async () => {
    const response = await createApp().fetch(
      new Request("https://kong.test/interactions", { method: "POST", body: JSON.stringify(ping) }),
      env,
    );

    expect(response.status).toBe(401);
  });
});

describe("/ping command", () => {
  it("replies privately that Kong is alive", async () => {
    const response = await send({
      type: 2,
      id: "1",
      token: "t",
      application_id: "app",
      guild_id: "guild",
      member: { user: { id: "100" }, permissions: "0" },
      data: { id: "c", name: "ping", type: 1 },
    });

    const reply = (await response.json()) as { type: number; data: { content: string; flags: number } };
    expect(reply.type).toBe(4);
    expect(reply.data.content).toBe("Pong! Kong is alive.");
    expect(reply.data.flags).toBe(64);
  });
});
