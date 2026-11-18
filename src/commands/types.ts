import type {
  APIApplicationCommandAutocompleteInteraction,
  APIChatInputApplicationCommandInteraction,
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

export type AutocompleteHandler = (
  interaction: APIApplicationCommandAutocompleteInteraction,
  ctx: CommandContext,
) => InteractionResponse | Promise<InteractionResponse>;

export type ComponentHandler = (
  interaction: APIMessageComponentInteraction,
  ctx: CommandContext,
) => InteractionResponse | Promise<InteractionResponse>;

export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction,
  ctx: CommandContext,
) => InteractionResponse | Promise<InteractionResponse>;
