import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco, tacoAutocomplete } from "./taco";
import { REMOVE_ID, removeChosen, tacoAdmin } from "./taco-admin";
import type { AutocompleteHandler, CommandHandler, ComponentHandler } from "./types";
import { UNBOOK_SELECT_ID, unbook, unbookSelected } from "./unbook";

export const commands: Record<string, CommandHandler> = { ping, bookings, taco, "taco-admin": tacoAdmin, unbook };

/** Autocomplete handlers, keyed by command name. */
export const autocompletes: Record<string, AutocompleteHandler> = { taco: tacoAutocomplete };

/** Message component handlers, keyed by the part of custom_id before the first ":". */
export const components: Record<string, ComponentHandler> = {
  [REMOVE_ID]: removeChosen,
  [UNBOOK_SELECT_ID]: unbookSelected,
};
