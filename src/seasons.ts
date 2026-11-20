import { desc, eq, isNull } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { seasons } from "./db/schema";

/** The Season currently collecting Tacos. Season 1 is created the first time it is needed. */
export async function currentSeason(db: DrizzleD1Database, today: string) {
  const find = () =>
    db.select().from(seasons).where(isNull(seasons.endedAt)).orderBy(desc(seasons.number)).limit(1).then((r) => r[0]);

  const existing = await find();
  if (existing) return existing;

  await db.insert(seasons).values({ number: 1, startedAt: today }).onConflictDoNothing();
  return (await find())!;
}

/** The Season the user asked for by number, or the current one when they gave none. Undefined if it does not exist. */
export async function chosenSeason(db: DrizzleD1Database, today: string, number: number | undefined) {
  const current = await currentSeason(db, today);
  if (number === undefined || number === current.number) return current;
  return db.select().from(seasons).where(eq(seasons.number, number)).then((r) => r[0]);
}

export const seasonLabel = (s: { number: number; name: string | null }) =>
  s.name ? `Season ${s.number} (${s.name})` : `Season ${s.number}`;
