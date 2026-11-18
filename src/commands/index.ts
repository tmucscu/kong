import { book, bookInteraction } from "./book";
import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco } from "./taco";
import type { CommandHandler, ComponentHandler } from "./types";

export const commands: Record<string, CommandHandler> = { ping, bookings, taco, book };

/** Component and modal handlers, keyed by the first segment of the custom_id ("book:date" -> "book"). */
export const componentHandlers: Record<string, ComponentHandler> = { book: bookInteraction };
