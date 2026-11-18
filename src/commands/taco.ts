import { count, desc, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { APIApplicationCommandInteractionDataOption } from "discord-api-types/v10";
import { tacos } from "../db/schema";
import { InteractionResponseType, MessageFlags } from "../discord/constants";
import { currentSeason, seasonLabel } from "../seasons";
import { todayIn } from "../time";
import type { CommandHandler, CommandContext, InteractionResponse } from "./types";

type Interaction = Parameters<CommandHandler>[0];
type Sub = { name: string; options?: { name: string; value?: unknown }[] };

const ORANGE = 0xe67e22;
const MEDALS = ["🥇", "🥈", "🥉"];
const option = (sub: Sub, name: string) => sub.options?.find((o) => o.name === name)?.value as string | undefined;

const refuse = (content: string): InteractionResponse => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content, flags: MessageFlags.Ephemeral },
});

async function give(interaction: Interaction, sub: Sub, { env, now }: CommandContext): Promise<InteractionResponse> {
  const giver = interaction.member!.user.id;
  const recipients = [
    ...new Set(["user1", "user2", "user3", "user4", "user5"].map((n) => option(sub, n)).filter(Boolean) as string[]),
  ];
  const reason = option(sub, "reason")!;

  if (recipients.includes(giver)) return refuse("You cannot give yourself a taco!");
  const users = (interaction.data as { resolved?: { users?: Record<string, { bot?: boolean }> } }).resolved?.users ?? {};
  if (recipients.some((id) => users[id]?.bot)) return refuse("Bots can't receive tacos!");

  const db = drizzle(env.DB);
  const today = todayIn(env.TIMEZONE, now);
  const season = await currentSeason(db, today);
  await db.insert(tacos).values(recipients.map((recipientId) => ({
    seasonId: season.id, giverId: giver, recipientId, reason, date: today,
  })));

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `<@${giver}> gave a 🌮 to ${recipients.map((id) => `<@${id}>`).join(", ")} because they ${reason} 👏👏`,
      allowed_mentions: { parse: [] },
    },
  };
}

async function leaderboard({ env, now }: CommandContext): Promise<InteractionResponse> {
  const db = drizzle(env.DB);
  const season = await currentSeason(db, todayIn(env.TIMEZONE, now));

  const rows = await db
    .select({ recipientId: tacos.recipientId, total: count() })
    .from(tacos)
    .where(eq(tacos.seasonId, season.id))
    .groupBy(tacos.recipientId)
    .orderBy(desc(count()), asc(tacos.recipientId));

  const lines = rows.map((r, i) => {
    if (i < 3) return `${MEDALS[i]} <@${r.recipientId}> - ${r.total}`;
    const rank = `${String(i + 1).padStart(2, "0")}. <@${r.recipientId}> - ${r.total}`;
    return i === 3 ? `=====\n${rank}` : rank;
  });

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [{
        title: `🌮 Tacos: Season ${season.number}`,
        description: lines.length ? lines.join("\n") : "No tacos yet this season!",
        color: ORANGE,
      }],
      allowed_mentions: { parse: [] },
    },
  };
}

export const taco: CommandHandler = async (interaction, ctx) => {
  const sub = interaction.data.options?.[0] as APIApplicationCommandInteractionDataOption & Sub;
  if (sub.name === "give") return give(interaction, sub, ctx);
  if (sub.name === "leaderboard") return leaderboard(ctx);
  throw new Error(`Unknown taco subcommand: ${sub.name}`);
};
