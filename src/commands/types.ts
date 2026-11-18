import type {
  APIChatInputApplicationCommandInteraction,
  APIMessageStringSelectInteractionData,
  APIMessageComponentInteraction,
} from "discord-api-types/v10";
import type { Bindings } from "../env";

export interface InteractionResponse {
  type: number;
  data?: Record<string, unknown>;
}

export interface CommandContext {
  env: Bindings;
  now: Date;
}

export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction,
  ctx: CommandContext,
) => InteractionResponse | Promise<InteractionResponse>;

/** Handles a message component interaction (e.g. a select menu pick), routed by custom_id. */
export type ComponentHandler = (
  interaction: APIMessageComponentInteraction & { data: APIMessageStringSelectInteractionData },
  ctx: CommandContext,
) => InteractionResponse | Promise<InteractionResponse>;
