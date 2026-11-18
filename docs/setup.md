# Account setup (ticket 01)

Kong needs a Discord application and a Cloudflare account. No secret values are recorded here.

## Discord (do once for the test app, once again for the production app at cutover)

1. Create an application in the Discord developer portal.
2. Under **Bot**, enable the **Server Members** intent (the migration uses the member list).
3. Copy the **Application ID**, **Public Key** and **Bot token**.
4. Invite the bot with the `bot` and `applications.commands` scopes to the test server.
5. Once the Worker is deployed, set **Interactions Endpoint URL** to `https://<worker>.workers.dev/interactions`.

## Cloudflare (CSCU-owned account)

1. Create the D1 database: `pnpm exec wrangler d1 create kong`, then put the printed id in `wrangler.jsonc` as `database_id`.
2. Create an API token with *Workers Scripts: Edit* and *D1: Edit*.

## Where each value lives

| Value | Worker secret (`wrangler secret put`) | GitHub Actions secret | Local `.dev.vars` / shell |
|---|---|---|---|
| `DISCORD_PUBLIC_KEY` | yes | | |
| `DISCORD_APPLICATION_ID` | yes | | for `pnpm register` |
| `DISCORD_BOT_TOKEN` | yes | | for `pnpm register` |
| `DISCORD_GUILD_ID` (test server, later CSCU) | | | for `pnpm register` |
| `CLOUDFLARE_API_TOKEN` | | yes | |
| `CLOUDFLARE_ACCOUNT_ID` | | yes | |

## Registering commands

`DISCORD_GUILD_ID=<id> pnpm register` registers to one server. Use the test server id while developing and the CSCU id at cutover.
