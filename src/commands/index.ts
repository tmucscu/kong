import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco } from "./taco";
import type { CommandHandler } from "./types";

export const commands: Record<string, CommandHandler> = { ping, bookings, taco };
