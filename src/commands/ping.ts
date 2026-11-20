import { InteractionResponseType, MessageFlags } from "../discord/constants";
import type { CommandHandler } from "./types";

export const ping: CommandHandler = () => ({
  type: InteractionResponseType.ChannelMessageWithSource,
  data: { content: "Pong! Kong is alive.", flags: MessageFlags.Ephemeral },
});
