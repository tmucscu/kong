# 10: Migration: name matching report

**What to build:** A dry-run script that reads the old bookings, tacos and members JSON plus the live CSCU member list, tries to match each old name to a Discord user ID, and writes an `unmatched` file for a person to fill in or delete. Nothing is written to D1.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Names match using the old roster and the server's current member nicknames, ignoring case (tacos were stored UPPERCASE)
- [x] Both Taco recipients and givers are matched
- [x] Booking names are matched the same way, for future Bookings only
- [x] The unmatched file lists each unmatched name and how many records depend on it; entries left unfilled are dropped at import
- [x] A summary prints how many records matched and how many didn't

Verified with a Discord member fixture and a roster-only dry run of the legacy snapshot. Run against the live CSCU member list before cutover.
