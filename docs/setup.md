# Account setup (ticket 01)

Kong needs a Discord application and a Cloudflare account. No secret values are recorded here.

## Discord (do once for the test app, once again for the production app at cutover)

1. Create an application in the Discord developer portal.
2. Under **Bot**, enable the **Server Members** intent (the migration uses the member list).
3. Copy the **Application ID**, **Public Key** and **Bot token**.
4. Invite the bot with the `bot` and `applications.commands` scopes to the test server.
5. Once the Worker is deployed, set its Discord secrets. In particular, set `DISCORD_PUBLIC_KEY` to the Public Key for the app whose endpoint you are configuring.
6. Set **Interactions Endpoint URL** to `https://<worker>.workers.dev/interactions`. Discord sends a signed verification ping when you save it.

## Cloudflare (CSCU-owned account)

1. Create the D1 database: `pnpm exec wrangler d1 create kong`, then put the printed id in `wrangler.jsonc` as `database_id`.
2. Create an API token with *Workers Scripts: Edit* and *D1: Edit*.

## Where each value lives

| Value | Worker secret (`wrangler secret put`) | GitHub Actions secret | Local `.dev.vars` / shell |
|---|---|---|---|
| `DISCORD_PUBLIC_KEY` | yes | | |
| `DISCORD_APPLICATION_ID` | yes | | for `pnpm register` |
| `DISCORD_BOT_TOKEN` | yes | | for `pnpm register` |
| `DISCORD_GUILD_ID` | | | for guild-specific registration or the CSCU member lookup during migration |
| `CLOUDFLARE_API_TOKEN` | | yes | |
| `CLOUDFLARE_ACCOUNT_ID` | | yes | |

## Registering commands

`pnpm register --global` publishes commands to every server where the app is installed. These commands are available in server channels. For a test server, use `DISCORD_GUILD_ID=<id> pnpm register`. Both modes read the app ID and bot token from `.dev.vars` or the shell.

## Migrating the legacy data

Put the exports from `env/members.json`, `booking/bookings.json`, and `taco/tacos.json` in the gitignored `legacy-data/` directory. Set the CSCU guild ID and a bot token with access to the CSCU member list, then generate the report:

```sh
pnpm migrate:legacy report
```

Review `legacy-data/unmatched.json`. Under `unmatched`, enter each confirmed Discord ID as a string in `userId`. Leave it blank or delete the entry to drop its dependent records. The `matches` object records matches from the dry run.

At cutover, stop the legacy bot before taking the final export. Generate a fresh report in the final export directory and carry over only reviewed resolutions that still apply. Generate the SQL and compare the reported counts with the final report before importing:

```sh
pnpm migrate:legacy import
pnpm exec wrangler d1 execute kong --remote --file legacy-data/import.sql
```

The import requires empty bookings and tacos tables and allows an existing open Season 1. It preserves Taco dates and includes Bookings whose end times have yet to pass in Toronto. Keep the generated files with the private export. After import, check `/bookings` and `/taco leaderboard` in CSCU.
