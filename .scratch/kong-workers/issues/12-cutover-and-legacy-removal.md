# 12: Cutover and legacy removal (human task)

**What to build:** Switch CSCU from the old Python bot to the Worker. Save the current `master` to a new branch first, then replace the Python code on `master` with the Worker and remove the Tailscale/SSH deploy workflow.

**Blocked by:** 05, 06, 08, 09, 11

**Status:** ready-for-agent (needs a human for the Discord and server steps)

- [ ] Current `master` saved to a new branch before merging
- [ ] Production Discord application created and the Worker configured for the CSCU server
- [ ] Old container stopped so the JSON stops changing; final JSON copied and imported
- [ ] Slash commands registered to the CSCU server; new bot invited and the old one removed
- [ ] Python code, Dockerfile, compose file and the Tailscale/SSH workflow removed; README rewritten
- [ ] A real booking and a real taco are done in CSCU as a final check
