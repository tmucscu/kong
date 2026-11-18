// Runtime values for the Discord enums Kong uses.
//
// discord-api-types ships CommonJS-wrapped enums that the Workers test runtime
// cannot load, so it is imported for *types only* and the numbers live here.
// Each `satisfies` clause makes the compiler reject a wrong number.
import type {
  InteractionResponseType as ResponseType,
  InteractionType as RequestType,
} from "discord-api-types/v10";

export const InteractionType = {
  Ping: 1 satisfies RequestType.Ping,
  ApplicationCommand: 2 satisfies RequestType.ApplicationCommand,
  MessageComponent: 3 satisfies RequestType.MessageComponent,
  ApplicationCommandAutocomplete: 4 satisfies RequestType.ApplicationCommandAutocomplete,
  ModalSubmit: 5 satisfies RequestType.ModalSubmit,
} as const;

export const InteractionResponseType = {
  Pong: 1 satisfies ResponseType.Pong,
  ChannelMessageWithSource: 4 satisfies ResponseType.ChannelMessageWithSource,
  DeferredChannelMessageWithSource: 5 satisfies ResponseType.DeferredChannelMessageWithSource,
  DeferredMessageUpdate: 6 satisfies ResponseType.DeferredMessageUpdate,
  UpdateMessage: 7 satisfies ResponseType.UpdateMessage,
  Modal: 9 satisfies ResponseType.Modal,
} as const;

export const MessageFlags = {
  Ephemeral: 64,
} as const;
