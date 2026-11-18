import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";

// Command definitions Discord shows in its picker. Registered by scripts/register-commands.ts.
export const definitions = [
  { name: "ping", description: "Check that Kong is alive" },
  { name: "bookings", description: "Show the Office bookings for the next 8 days" },
  { name: "book", description: "Book the Office" },
  {
    name: "taco",
    description: "Give members tacos",
    options: [
      {
        type: 1,
        name: "give",
        description: "Give a taco to up to 5 members",
        options: [
          { type: 6, name: "user1", description: "Who gets a taco", required: true },
          { type: 3, name: "reason", description: "Finish the sentence: they ...", required: true, max_length: 200 },
          ...[2, 3, 4, 5].map((n) => ({ type: 6 as const, name: `user${n}`, description: "Another member" })),
        ],
      },
      { type: 1, name: "leaderboard", description: "Show this season's taco leaderboard" },
    ],
  },
] satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];
