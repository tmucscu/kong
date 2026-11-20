# 09: Taco admin commands

**What to build:** `/taco new-season [name]` ends the current Season and starts the next, keeping all older Tacos. `/taco remove user:` lets an Admin pick one of that person's current-Season Tacos to remove. Both are visible only to people with Manage Server.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Both commands are hidden from non-Admins in Discord and also rejected by the Worker if a non-Admin sends them
- [x] A new Season gets the next number and an optional name; the leaderboard then starts empty
- [x] Removing a Taco asks the Admin to choose from a select and is announced or logged
- [x] Old Seasons stay viewable after a new one starts

**Implementation note:** The admin commands shipped as a separate top-level command, `/taco-admin new-season` and `/taco-admin remove`, because Discord can only hide a command from non-Admins (`default_member_permissions`) at the top level. Worker-side rejection of non-Admins is tested; whether Discord hides them can only be confirmed once the commands are registered (ticket 01).
