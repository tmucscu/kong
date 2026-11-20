import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach } from "vitest";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// D1 data is not rolled back between tests, so start each one from empty tables.
beforeEach(async () => {
  const { results } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations'",
  ).all<{ name: string }>();
  // Rows reference each other, so defer foreign key checks until all tables are empty.
  await env.DB.batch([
    env.DB.prepare("PRAGMA defer_foreign_keys = ON"),
    ...results.map(({ name }) => env.DB.prepare(`DELETE FROM "${name}"`)),
  ]);
});
