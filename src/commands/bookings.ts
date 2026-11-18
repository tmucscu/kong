import { and, asc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { bookings as bookingsTable } from "../db/schema";
import { InteractionResponseType } from "../discord/constants";
import { addDays, formatDay, formatTime, todayIn } from "../time";
import type { CommandHandler } from "./types";

const ORANGE = 0xe67e22;
const DAYS_SHOWN = 8;

export const bookings: CommandHandler = async (_interaction, { env, now }) => {
  const today = todayIn(env.TIMEZONE, now);
  const lastDay = addDays(today, DAYS_SHOWN - 1);

  const rows = await drizzle(env.DB)
    .select()
    .from(bookingsTable)
    .where(and(gte(bookingsTable.date, today), lte(bookingsTable.date, lastDay)))
    .orderBy(asc(bookingsTable.date), asc(bookingsTable.start));

  const byDay = new Map<string, string[]>();
  for (const b of rows) {
    const line = `${formatTime(b.start)} to ${formatTime(b.end)} for <@${b.userId}>${b.othersCanCome ? " [can come in]" : ""}`;
    byDay.set(b.date, [...(byDay.get(b.date) ?? []), line]);
  }

  const description =
    byDay.size === 0
      ? "The office is free all week!"
      : [...byDay].map(([date, lines]) => `**${formatDay(date)}**\n${lines.join("\n")}`).join("\n\n");

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [{ title: "Office Bookings", description, color: ORANGE }],
      allowed_mentions: { parse: [] },
    },
  };
};
