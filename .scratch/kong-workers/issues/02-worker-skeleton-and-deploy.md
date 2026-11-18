# 02: Worker skeleton, deploy pipeline and command registration

**What to build:** A Worker that verifies Discord request signatures and answers interactions. A `/ping` command works in the test server after a push to `master`. Commands register to either the test server or the CSCU server depending on a setting. D1 and Drizzle migrations are set up and applied as part of the deploy. See ADR 0001: interactions only, no gateway.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Requests with a bad or missing signature are rejected; Discord's endpoint verification succeeds
- [ ] `/ping` replies in the test server
- [ ] A command-registration script targets the test or CSCU server by configuration
- [ ] Push to `master` deploys the Worker and applies pending D1 migrations
- [ ] All times are handled in America/Toronto from the start
