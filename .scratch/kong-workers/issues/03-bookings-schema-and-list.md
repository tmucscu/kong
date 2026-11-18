# 03: Bookings schema and `/bookings`

**What to build:** The Booking table and a `/bookings` command showing the Office's Bookings for the next 8 days, grouped by day, in Toronto time. People appear as mentions with pings off, and the "others can come in" flag is shown. Bookings store the member's Discord user ID and no names.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Booking table with a migration, keyed to Discord user IDs
- [ ] `/bookings` lists the next 8 days; an empty week shows a clear "office is free" message
- [ ] Mentions render as current server nicknames and ping nobody
- [ ] Verified against seeded rows, including a day with several Bookings in chronological order
