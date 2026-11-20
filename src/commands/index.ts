import { book, bookInteraction } from "./book";
import { bookings } from "./bookings";
import { ping } from "./ping";
import { taco, tacoAutocomplete } from "./taco";
import { REMOVE_ID, removeChosen, tacoAdmin } from "./taco-admin";
import type { AutocompleteHandler, CommandHandler, ComponentHandler } from "./types";
import { UNBOOK_SELECT_ID, unbook, unbookSelected } from "./unbook";

export const commands: Record<string, CommandHandler> = {
  ping,
  bookings,
  book,
  unbook,
  taco,
  "taco-admin": tacoAdmin,
};

/** Autocomplete handlers, keyed by command name. */
export const autocompletes: Record<string, AutocompleteHandler> = { taco: tacoAutocomplete };

/** Component and modal handlers, keyed by the first segment of the custom_id ("book:date" -> "book"). */
export const components: Record<string, ComponentHandler> = {
  book: bookInteraction,
  [REMOVE_ID]: removeChosen,
  [UNBOOK_SELECT_ID]: unbookSelected,
};
