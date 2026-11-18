import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { seasons, tacos } from "../db/schema";
import { InteractionResponseType, MessageFlags } from "../discord/constants";
import { isAdmin } from "../permissions";
import { currentSeason, seasonLabel } from "../seasons";
import { todayIn } from "../time";
import type { CommandContext, CommandHandler, ComponentHandler, InteractionResponse } from "./types";

type Sub = { name: string; options?: { name: string; value?: unknown }[] };
const option = (sub: Sub, name: string) => sub.options?.find((o) => o.name === name)?.value as string | undefined;

async function newSeason(sub: Sub, { env, now }: CommandContext): Promise<InteractionResponse> {
  const db = drizzle(env.DB);
  const today = todayIn(env.TIMEZONE, now);
  const ending = await currentSeason(db, today);
  const name = option(sub, "name")?.trim() || null;
  const next = { number: ending.number + 1, name, startedAt: today };

  await db.batch([
    db.update(seasons).set({ endedAt: today }).where(eq(seasons.id, ending.id)),
    db.insert(seasons).values(next),
  ]);

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `${seasonLabel(next)} has started! ${seasonLabel({ number: ending.number, name: null })} is archived.`,
      allowed_mentions: { parse: [] },
    },
  };
}

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

async function remove(sub: Sub, { env, now }: CommandContext): Promise<InteractionResponse> {
  const userId = option(sub, "user")!;
  const db = drizzle(env.DB);
  const season = await currentSeason(db, todayIn(env.TIMEZONE, now));

  const rows = await db
    .select()
    .from(tacos)
    .where(and(eq(tacos.seasonId, season.id), eq(tacos.recipientId, userId)))
    .orderBy(desc(tacos.date), desc(tacos.id))
    .limit(25);

  if (!rows.length) {
    return ephemeral(`<@${userId}> has no tacos this season`);
  }

  // Select labels cannot mention anyone, so the givers are listed in the message body.
  // Message content is capped at 2000 characters, so the body shortens each reason.
  const body = rows.map((t) => `${t.date}: ${clip(t.reason, 35)} from <@${t.giverId}>`).join("\n");
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `Which of <@${userId}>'s tacos should be removed?\n${body}`,
      flags: MessageFlags.Ephemeral,
      allowed_mentions: { parse: [] },
      components: [{
        type: 1,
        components: [{
          type: 3,
          custom_id: REMOVE_ID,
          placeholder: "Choose a taco to remove",
          options: rows.map((t) => ({ label: clip(`${t.date}: ${t.reason}`, 100), value: String(t.id) })),
        }],
      }],
    },
  };
}

export const REMOVE_ID = "taco-remove";

const ephemeral = (content: string): InteractionResponse => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content, flags: MessageFlags.Ephemeral, allowed_mentions: { parse: [] } },
});

export const adminOnly: InteractionResponse = {
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content: "Only admins can do that.", flags: MessageFlags.Ephemeral },
};

export const removeChosen: ComponentHandler = async (interaction, { env }) => {
  // Re-checked here: a select's custom_id and values can be replayed by anyone who can see the message.
  if (!isAdmin(interaction)) return adminOnly;

  const id = Number((interaction.data as { values?: string[] }).values?.[0]);
  const db = drizzle(env.DB);
  const [removed] = await db.delete(tacos).where(eq(tacos.id, id)).returning();
  if (!removed) return ephemeral("That taco was already removed.");

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content: `An admin removed a taco from <@${removed.recipientId}>`, allowed_mentions: { parse: [] } },
  };
};

export const tacoAdmin: CommandHandler = async (interaction, ctx) => {
  if (!isAdmin(interaction)) return adminOnly;
  const sub = interaction.data.options?.[0] as unknown as Sub;
  if (sub.name === "new-season") return newSeason(sub, ctx);
  if (sub.name === "remove") return remove(sub, ctx);
  throw new Error(`Unknown taco-admin subcommand: ${sub.name}`);
};
