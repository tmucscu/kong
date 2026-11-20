# 11: Migration: import

**What to build:** Import the matched data into D1: all existing Tacos as Season 1 (the current Season) and future Bookings only. Taco dates keep their day.

**Blocked by:** 10, 03, 07

**Status:** ready-for-agent

- [x] Uses the completed unmatched file; entries still unmatched are dropped and counted
- [x] Counts imported and dropped are reported for tacos and bookings
- [ ] Imported Bookings do not overlap and appear in `/bookings`
- [ ] Imported Tacos appear on the Season 1 leaderboard with correct totals
- [x] Re-running against an empty database gives the same result

Verified the reviewed export in local D1, then imported it into production D1. The open Season 1 contains 14 Tacos for 11 recipients. Two Tacos with an unresolved member and 131 expired Bookings were excluded. The live Discord command checks are pending installation in CSCU.
