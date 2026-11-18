# 02: Worker skeleton, deploy pipeline and command registration

**What to build:** A Worker that verifies Discord request signatures and answers interactions. A `/ping` command works in the test server after a push to `master`. Commands register to either the test server or the CSCU server depending on a setting. D1 and Drizzle migrations are set up and applied as part of the deploy. See ADR 0001: interactions only, no gateway.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Requests with a bad or missing signature are rejected; Discord's endpoint verification succeeds (rejection tested locally; live verification needs ticket 01)
- [ ] `/ping` replies in the test server
- [x] A command-registration script targets the test or CSCU server by configuration
- [ ] Push to `master` deploys the Worker and applies pending D1 migrations
- [ ] All times are handled in America/Toronto from the start

**Progress:** Verified locally with tests: signature rejection, ping/pong and `/ping`. The registration script and the deploy workflow are written. Still unticked because they need ticket 01: Discord's live endpoint verification, `/ping` in the test server, and a real push-to-deploy run. Toronto-time handling arrives with the first time-based ticket (03); the `TIMEZONE` setting is in place.
