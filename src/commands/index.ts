import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco, tacoAutocomplete } from "./taco";
import type { AutocompleteHandler, CommandHandler } from "./types";

export const commands: Record<string, CommandHandler> = { ping, bookings, taco };

/** Autocomplete handlers, keyed by command name. */
export const autocompletes: Record<string, AutocompleteHandler> = { taco: tacoAutocomplete };
