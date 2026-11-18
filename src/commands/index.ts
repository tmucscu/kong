import { ping } from "./ping";
import type { CommandHandler } from "./types";

export const commands: Record<string, CommandHandler> = { ping };
