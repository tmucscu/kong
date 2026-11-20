import type { APIMessageStringSelectInteractionData } from "discord-api-types/v10";
import { and, asc, eq, gt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { bookings as bookingsTable } from "../db/schema";
import { InteractionResponseType, MessageFlags } from "../discord/constants";
import { formatDay, formatTime, timeIn, todayIn } from "../time";
import { isAdmin } from "../permissions";
import type { CommandHandler, ComponentHandler } from "./types";

export const UNBOOK_SELECT_ID = "unbook";
const MAX_OPTIONS = 25;

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDay(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${SHORT_MONTHS[month - 1]} ${day}`;
}

function ephemeral(content: string) {
  return { type: InteractionResponseType.ChannelMessageWithSource, data: { flags: MessageFlags.Ephemeral, content } };
}

export const unbook: CommandHandler = async (interaction, { env, now }) => {
  const userId = interaction.member!.user.id;
  const today = todayIn(env.TIMEZONE, now);
  const time = timeIn(env.TIMEZONE, now);

  const rows = await drizzle(env.DB)
    .select()
    .from(bookingsTable)
    .where(
      and(
        isAdmin(interaction) ? undefined : eq(bookingsTable.userId, userId),
        or(gt(bookingsTable.date, today), and(eq(bookingsTable.date, today), gt(bookingsTable.end, time))),
      ),
    )
    .orderBy(asc(bookingsTable.date), asc(bookingsTable.start))
    .limit(MAX_OPTIONS);

  if (rows.length === 0) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { flags: MessageFlags.Ephemeral, content: "You have no bookings to delete!" },
    };
  }

  const lines = rows.map(
    (b, i) => `${i + 1}. ${formatDay(b.date)}, ${formatTime(b.start)} to ${formatTime(b.end)}, <@${b.userId}>`,
  );

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: `Pick a booking to delete:\n${lines.join("\n")}`,
      allowed_mentions: { parse: [] },
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: UNBOOK_SELECT_ID,
              placeholder: "Choose a booking",
              options: rows.map((b, i) => ({
                label: `${i + 1}. ${shortDay(b.date)} ${formatTime(b.start)} to ${formatTime(b.end)}`,
                value: String(b.id),
              })),
            },
          ],
        },
      ],
    },
  };
};

export const unbookSelected: ComponentHandler = async (interaction, { env }) => {
  const actorId = interaction.member!.user.id;
  const db = drizzle(env.DB);
  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, Number((interaction.data as APIMessageStringSelectInteractionData).values[0])));

  if (!booking) return ephemeral("That booking no longer exists.");

  if (booking.userId !== actorId && !isAdmin(interaction)) {
    return ephemeral("You can only delete your own bookings.");
  }

  await db.delete(bookingsTable).where(eq(bookingsTable.id, booking.id));

  const when = `on ${formatDay(booking.date)} from ${formatTime(booking.start)} to ${formatTime(booking.end)}`;
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content:
        booking.userId === actorId
          ? `<@${actorId}> has deleted their booking ${when}`
          : `<@${actorId}> removed <@${booking.userId}>'s booking ${when}`,
      allowed_mentions: { parse: [] },
    },
  };
};
