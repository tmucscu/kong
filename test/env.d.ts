import type { D1Migration } from "@cloudflare/vitest-plugin";

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TIMEZONE: string;
      DISCORD_PUBLIC_KEY: string;
      DISCORD_APPLICATION_ID: string;
      DISCORD_BOT_TOKEN: string;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
