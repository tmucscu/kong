import { freeEnds, freeStarts, isBookable } from "../src/booking-rules";

const NOW = { date: "2026-11-18", time: "12:01" };

describe("free start times", () => {
  it("offers every quarter hour from 6 AM to 11:45 PM on a day with no Bookings", () => {
    const starts = freeStarts("2026-11-19", [], NOW);

    expect(starts).toHaveLength(72);
    expect(starts[0]).toBe("06:00");
    expect(starts[1]).toBe("06:15");
    expect(starts.at(-1)).toBe("23:45");
  });

  it("excludes every quarter hour inside a Booking but allows starting the moment it ends", () => {
    const starts = freeStarts("2026-11-19", [{ start: "09:00", end: "10:30" }], NOW);

    expect(starts).toContain("08:45");
    for (const taken of ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15"]) expect(starts).not.toContain(taken);
    expect(starts).toContain("10:30");
    expect(starts).toHaveLength(72 - 6);
  });

  it("excludes the spans of several Bookings on the same day", () => {
    const starts = freeStarts(
      "2026-11-19",
      [
        { start: "07:00", end: "07:30" },
        { start: "13:00", end: "14:00" },
      ],
      NOW,
    );

    expect(starts).not.toContain("07:15");
    expect(starts).not.toContain("13:45");
    expect(starts).toContain("07:30");
    expect(starts).toContain("14:00");
    expect(starts).toHaveLength(72 - 2 - 4);
  });

  it("stops offering starts inside a Booking that runs until midnight", () => {
    const starts = freeStarts("2026-11-19", [{ start: "22:00", end: "24:00" }], NOW);

    expect(starts.at(-1)).toBe("21:45");
  });

  it("on today, hides times before the current quarter hour but keeps the current one (12:01 allows 12:00)", () => {
    const starts = freeStarts("2026-11-18", [], NOW);

    expect(starts[0]).toBe("12:00");
    expect(starts).toHaveLength(48);
  });

  it("on today, at exactly a quarter hour that quarter hour is the first start", () => {
    expect(freeStarts("2026-11-18", [], { date: "2026-11-18", time: "12:15" })[0]).toBe("12:15");
    expect(freeStarts("2026-11-18", [], { date: "2026-11-18", time: "12:14" })[0]).toBe("12:00");
  });

  it("still starts at 6 AM before 6 AM, and keeps 11:45 PM bookable late in the evening", () => {
    expect(freeStarts("2026-11-18", [], { date: "2026-11-18", time: "05:10" })[0]).toBe("06:00");
    expect(freeStarts("2026-11-18", [], { date: "2026-11-18", time: "23:50" })).toEqual(["23:45"]);
  });

  it("offers nothing for a day in the past", () => {
    expect(freeStarts("2026-11-17", [], NOW)).toEqual([]);
  });
});

describe("free end times", () => {
  it("run in quarter hours from 15 minutes after the start up to midnight", () => {
    const ends = freeEnds("09:00", []);

    expect(ends[0]).toBe("09:15");
    expect(ends.at(-1)).toBe("24:00");
    expect(ends).toHaveLength(60);
  });

  it("allow a Booking from 11:45 PM to midnight", () => {
    expect(freeEnds("23:45", [])).toEqual(["24:00"]);
  });

  it("are limited to the start of the next Booking, which itself is allowed (back to back)", () => {
    const ends = freeEnds("09:00", [{ start: "11:00", end: "12:00" }]);

    expect(ends.at(-1)).toBe("11:00");
    expect(ends).toHaveLength(8);
  });

  it("ignore earlier Bookings and use the nearest later one", () => {
    const ends = freeEnds("09:00", [
      { start: "07:00", end: "09:00" },
      { start: "15:00", end: "16:00" },
      { start: "12:30", end: "13:00" },
    ]);

    expect(ends.at(-1)).toBe("12:30");
  });

  it("are empty when the start is inside a Booking", () => {
    expect(freeEnds("09:30", [{ start: "09:00", end: "10:00" }])).toEqual([]);
  });
});

describe("whether a Booking is allowed", () => {
  const spans = [{ start: "09:00", end: "10:30" }];

  it("accepts a Booking that starts exactly when another ends", () => {
    expect(isBookable("2026-11-19", spans, "10:30", "11:00", NOW)).toBe(true);
  });

  it("accepts a Booking that ends exactly when another starts", () => {
    expect(isBookable("2026-11-19", spans, "08:00", "09:00", NOW)).toBe(true);
  });

  it("rejects a Booking that overlaps the start, the end or the whole of another", () => {
    expect(isBookable("2026-11-19", spans, "08:00", "09:15", NOW)).toBe(false);
    expect(isBookable("2026-11-19", spans, "10:15", "11:00", NOW)).toBe(false);
    expect(isBookable("2026-11-19", spans, "08:00", "12:00", NOW)).toBe(false);
    expect(isBookable("2026-11-19", spans, "09:15", "10:00", NOW)).toBe(false);
  });

  it("accepts a Booking that ends at midnight", () => {
    expect(isBookable("2026-11-19", spans, "22:00", "24:00", NOW)).toBe(true);
  });

  it("rejects an end that is not after the start, is off the quarter hour, or is past midnight", () => {
    expect(isBookable("2026-11-19", [], "10:00", "10:00", NOW)).toBe(false);
    expect(isBookable("2026-11-19", [], "10:00", "09:45", NOW)).toBe(false);
    expect(isBookable("2026-11-19", [], "10:00", "10:20", NOW)).toBe(false);
    expect(isBookable("2026-11-19", [], "10:00", "24:15", NOW)).toBe(false);
  });

  it("rejects a start before 6 AM", () => {
    expect(isBookable("2026-11-19", [], "05:45", "07:00", NOW)).toBe(false);
  });

  it("rejects a start earlier than the current quarter hour today", () => {
    expect(isBookable("2026-11-18", [], "11:45", "13:00", NOW)).toBe(false);
    expect(isBookable("2026-11-18", [], "12:00", "13:00", NOW)).toBe(true);
  });
});
