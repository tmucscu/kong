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
