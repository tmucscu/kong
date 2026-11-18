import { verifyKey } from "discord-interactions";
import type { APIInteraction } from "discord-api-types/v10";
import { InteractionResponseType, InteractionType } from "./discord/constants";
import { Hono } from "hono";
import { commands, componentHandlers } from "./commands";
import type { Bindings } from "./env";

// Outbound dependencies (Discord REST) are injected so tests can replace them.
export interface AppDeps {
  now: () => Date;
}

export function createApp(deps: Partial<AppDeps> = {}) {
  const now = deps.now ?? (() => new Date());
  const app = new Hono<{ Bindings: Bindings }>();

  app.post("/interactions", async (c) => {
    const signature = c.req.header("x-signature-ed25519");
    const timestamp = c.req.header("x-signature-timestamp");
    const body = await c.req.text();

    const valid = signature && timestamp && (await verifyKey(body, signature, timestamp, c.env.DISCORD_PUBLIC_KEY));
    if (!valid) return c.text("invalid request signature", 401);

    const interaction = JSON.parse(body) as APIInteraction;
    if (interaction.type === InteractionType.Ping) {
      return c.json({ type: InteractionResponseType.Pong });
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      const handler = commands[interaction.data.name];
      if (handler) return c.json(await handler(interaction as never, { env: c.env, now: now() }));
    }

    if (interaction.type === InteractionType.MessageComponent || interaction.type === InteractionType.ModalSubmit) {
      const handler = componentHandlers[interaction.data.custom_id.split(":")[0]];
      if (handler) return c.json(await handler(interaction, { env: c.env, now: now() }));
    }

    return c.text("unsupported interaction", 400);
  });

  return app;
}
