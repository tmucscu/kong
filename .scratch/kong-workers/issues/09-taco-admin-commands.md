# 09: Taco admin commands

**What to build:** `/taco new-season [name]` ends the current Season and starts the next, keeping all older Tacos. `/taco remove user:` lets an Admin pick one of that person's current-Season Tacos to remove. Both are visible only to people with Manage Server.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Both commands are hidden from non-Admins in Discord and also rejected by the Worker if a non-Admin sends them
- [ ] A new Season gets the next number and an optional name; the leaderboard then starts empty
- [ ] Removing a Taco asks the Admin to choose from a select and is announced or logged
- [ ] Old Seasons stay viewable after a new one starts
