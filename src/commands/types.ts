import type { APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import type { Bindings } from "../env";

export interface InteractionResponse {
  type: number;
  data?: Record<string, unknown>;
}

export type CommandHandler = (
  interaction: APIChatInputApplicationCommandInteraction,
  env: Bindings,
) => InteractionResponse | Promise<InteractionResponse>;
