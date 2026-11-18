# 01: Provision accounts (human task)

**What to build:** Everything external that the Worker needs before any code can run: a test Discord application with a private test server, a CSCU-owned Cloudflare account with a D1 database, and the secrets wired into GitHub.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent (needs a human to do the account steps; an agent can write the checklist and verify)

- [ ] Test Discord application created, with the Server Members intent enabled
- [ ] Private test server exists and the test bot is invited
- [ ] Cloudflare account owned by CSCU, with a D1 database created
- [ ] GitHub repo secrets set for the Cloudflare API token and the Discord application ID, public key and bot token
- [x] A short setup note records which values live where (no secret values written down)

**Progress:** The setup checklist is written in `docs/setup.md`. The boxes above stay unticked until a person creates the accounts and secrets.
