import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco } from "./taco";
import type { CommandHandler, ComponentHandler } from "./types";
import { UNBOOK_SELECT_ID, unbook, unbookSelected } from "./unbook";

export const components: Record<string, ComponentHandler> = { [UNBOOK_SELECT_ID]: unbookSelected };

export const commands: Record<string, CommandHandler> = { ping, bookings, taco, unbook };
