import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";

// Command definitions Discord shows in its picker. Registered by scripts/register-commands.ts.
export const definitions = [
  { name: "ping", description: "Check that Kong is alive" },
  { name: "bookings", description: "Show the Office bookings for the next 8 days" },
] satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];
