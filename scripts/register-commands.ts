// Registers Kong's slash commands with Discord for ONE server.
//
//   DISCORD_APPLICATION_ID, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID=<test or CSCU server id>
//   pnpm register
//
// Pointing DISCORD_GUILD_ID at the test server while developing and at the CSCU
// server at cutover is the only difference between the two environments.
import { definitions } from "../src/commands/definitions.ts";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

const applicationId = required("DISCORD_APPLICATION_ID");
const token = required("DISCORD_BOT_TOKEN");
const guildId = required("DISCORD_GUILD_ID");

const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`,
  {
    method: "PUT",
    headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
    body: JSON.stringify(definitions),
  },
);

if (!response.ok) {
  console.error(`Registration failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const registered = (await response.json()) as { name: string }[];
console.log(`Registered ${registered.length} commands to guild ${guildId}: ${registered.map((c) => c.name).join(", ")}`);
