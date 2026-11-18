// Pure rules for what can be booked in the Office. Times are "HH:MM" ("24:00" = midnight as an end).
export interface Span {
  start: string;
  end: string;
}

/** The current moment in the Office's time zone. */
export interface LocalNow {
  date: string;
  time: string;
}

const FIRST_START = 6 * 60;
const LAST_END = 24 * 60;
const STEP = 15;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** End times for a Booking starting at `start`, up to the next Booking's start or midnight. */
export function freeEnds(start: string, spans: Span[]): string[] {
  const from = toMinutes(start);
  if (spans.some((s) => from >= toMinutes(s.start) && from < toMinutes(s.end))) return [];
  const limit = Math.min(LAST_END, ...spans.map((s) => toMinutes(s.start)).filter((s) => s > from));
  const ends: string[] = [];
  for (let m = from + STEP; m <= limit; m += STEP) ends.push(toTime(m));
  return ends;
}

export function isBookable(date: string, spans: Span[], start: string, end: string, now: LocalNow): boolean {
  return freeStarts(date, spans, now).includes(start) && freeEnds(start, spans).includes(end);
}

export function freeStarts(date: string, spans: Span[], now: LocalNow): string[] {
  if (date < now.date) return [];
  // The current quarter hour is still bookable, so round the time down.
  const earliest = date === now.date ? Math.floor(toMinutes(now.time) / STEP) * STEP : 0;
  const starts: string[] = [];
  for (let m = Math.max(FIRST_START, earliest); m < LAST_END; m += STEP) {
    const taken = spans.some((s) => m >= toMinutes(s.start) && m < toMinutes(s.end));
    if (!taken) starts.push(toTime(m));
  }
  return starts;
}
