import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco, tacoAutocomplete } from "./taco";
import { REMOVE_ID, removeChosen, tacoAdmin } from "./taco-admin";
import type { AutocompleteHandler, CommandHandler, ComponentHandler } from "./types";

export const commands: Record<string, CommandHandler> = { ping, bookings, taco, "taco-admin": tacoAdmin };

/** Autocomplete handlers, keyed by command name. */
/** Message component handlers, keyed by custom_id. */
export const components: Record<string, ComponentHandler> = { [REMOVE_ID]: removeChosen };

export const autocompletes: Record<string, AutocompleteHandler> = { taco: tacoAutocomplete };
