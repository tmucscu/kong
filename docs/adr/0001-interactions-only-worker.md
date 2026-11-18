# Kong runs as an interactions-only Cloudflare Worker with no gateway connection

Kong was a long-running discord.py process that kept a gateway connection open and saved its data in JSON files on a self-hosted box. It is now a Cloudflare Worker that only answers Discord's HTTP interactions and stores its data in D1. That removes the server, the Tailscale/SSH deploys and the risk of corrupting files when two writes overlap.

## Consequences

Without a gateway connection, Kong cannot see presence, reactions, message content or voice state. So the live "office is free" status, the reaction-based announcement tracker and Wall of Shame, prefix (`kong …`) commands and the Valorant team picker were all dropped deliberately, not forgotten. Bringing any of them back means adding a gateway process, which reverses this decision.
