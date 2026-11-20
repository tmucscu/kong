import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// A claim on the Office for a span of time on a single day (see CONTEXT.md).
// Dates are "YYYY-MM-DD" and times are "HH:MM" in America/Toronto; midnight as an end is "24:00".
export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    start: text("start").notNull(),
    end: text("end").notNull(),
    reason: text("reason"),
    note: text("note"),
    othersCanCome: integer("others_can_come", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("bookings_date_idx").on(t.date, t.start)],
);

// The span a Taco leaderboard covers (see CONTEXT.md). The current Season is the one not yet ended.
export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: integer("number").notNull().unique(),
  name: text("name"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});

// A public shoutout from one Member to another. Dates are "YYYY-MM-DD" in America/Toronto.
export const tacos = sqliteTable(
  "tacos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seasonId: integer("season_id").notNull().references(() => seasons.id),
    giverId: text("giver_id").notNull(),
    recipientId: text("recipient_id").notNull(),
    reason: text("reason").notNull(),
    date: text("date").notNull(),
  },
  (t) => [index("tacos_season_recipient_idx").on(t.seasonId, t.recipientId)],
);
