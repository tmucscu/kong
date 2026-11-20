// Registers Kong's slash commands for a test server or across server installations.
import { definitions } from "../src/commands/definitions.ts";
import { ApplicationIntegrationType, InteractionContextType } from "discord-api-types/v10";

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
const args = process.argv.slice(2);
const global = args.length === 1 && args[0] === "--global";
if (args.length && !global) {
  console.error("Usage: pnpm register [--global]");
  process.exit(1);
}

const guildId = global ? undefined : required("DISCORD_GUILD_ID");
const scope = guildId ? `/guilds/${guildId}` : "";
const commands = global
  ? definitions.map((command) => ({
      ...command,
      integration_types: [ApplicationIntegrationType.GuildInstall],
      contexts: [InteractionContextType.Guild],
    }))
  : definitions;

const response = await fetch(
  `https://discord.com/api/v10/applications/${applicationId}${scope}/commands`,
  {
    method: "PUT",
    headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
  },
);

if (!response.ok) {
  console.error(`Registration failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const registered = (await response.json()) as { name: string }[];
const destination = guildId ? `guild ${guildId}` : "all server installations";
console.log(`Registered ${registered.length} commands for ${destination}: ${registered.map((c) => c.name).join(", ")}`);
