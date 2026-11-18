import type { APIInteraction } from "discord-api-types/v10";

const MANAGE_GUILD = 1n << 5n;

/**
 * An Admin is a Member with the Manage Server permission (see CONTEXT.md).
 * Discord computes `member.permissions` for the invoking member and signs the
 * payload, so this is checked server-side on every interaction, not just hidden in the UI.
 */
export function isAdmin(interaction: Pick<APIInteraction, "member">): boolean {
  const permissions = interaction.member?.permissions;
  return permissions !== undefined && (BigInt(permissions) & MANAGE_GUILD) !== 0n;
}
