# 07: Tacos: give and leaderboard

**What to build:** The Taco and Season tables, with Season 1 created automatically. `/taco give` gives a Taco to up to 5 Members with a required reason, and `/taco leaderboard` ranks the current Season with medals for the top 3, as the old bot did.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Tacos store giver and recipient as Discord user IDs, plus the reason and date
- [ ] Giving a Taco to yourself or to a bot is refused (checked by ID)
- [ ] Giving to several people in one command works and posts one public message
- [ ] The leaderboard counts only the current Season and shows people as mentions with pings off
