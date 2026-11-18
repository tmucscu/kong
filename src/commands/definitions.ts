import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord-api-types/v10";

const seasonOption = {
  type: 4 as const,
  name: "season",
  description: "Which season (defaults to the current one)",
  autocomplete: true,
};

// Command definitions Discord shows in its picker. Registered by scripts/register-commands.ts.
export const definitions = [
  { name: "ping", description: "Check that Kong is alive" },
  { name: "bookings", description: "Show the Office bookings for the next 8 days" },
  { name: "unbook", description: "Delete one of your office bookings" },
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
      { type: 1, name: "leaderboard", description: "Show a season's taco leaderboard", options: [seasonOption] },
      {
        type: 1,
        name: "history",
        description: "Show the tacos a member received",
        options: [{ type: 6, name: "user", description: "Whose tacos to show", required: true }, seasonOption],
      },
    ],
  },
  {
    // Hidden from people without Manage Server (32); the Worker checks `isAdmin` as well.
    name: "taco-admin",
    description: "Admin tools for tacos",
    default_member_permissions: "32",
    options: [
      {
        type: 1,
        name: "new-season",
        description: "End the current season and start the next one",
        options: [{ type: 3, name: "name", description: "Optional name, e.g. Winter 2027", max_length: 50 }],
      },
      {
        type: 1,
        name: "remove",
        description: "Remove one of a member's tacos this season",
        options: [{ type: 6, name: "user", description: "Whose taco to remove", required: true }],
      },
    ],
  },
] satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];
