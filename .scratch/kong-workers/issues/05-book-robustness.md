# 05: `/book` robustness

**What to build:** The edges of the booking flow: Back and Cancel on every step, greyed-out unavailable minutes, a re-check for overlaps when the modal is submitted (someone else may have booked meanwhile), friendly handling of expired flows, and correct availability when booking for today.

**Blocked by:** 04

**Status:** ready-for-agent

- [x] Back and Cancel work on every step and never leave a half-saved Booking
- [x] Switching the hour never keeps a minute that isn't free for that hour
- [x] If the chosen time was taken by someone else before submit, the user sees a clear message and nothing is saved
- [x] An expired or stale flow gives a helpful message instead of an error
- [x] For today, times earlier than now are unavailable, but the current quarter hour can still be booked
