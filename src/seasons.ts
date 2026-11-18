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

export const seasonLabel = (s: { number: number; name: string | null }) =>
  s.name ? `Season ${s.number} (${s.name})` : `Season ${s.number}`;
