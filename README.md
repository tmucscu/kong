# Kong

The CSCU Discord server's in-house bot: it books the Office and gives out tacos.

Kong is a Cloudflare Worker that answers Discord slash commands over HTTP and stores its data in D1. It has no always-on process and no gateway connection (see `docs/adr/0001-interactions-only-worker.md`). The previous Python bot lives on the `legacy` branch.

## Commands

| Command | Who | What it does |
|---|---|---|
| `/book` | Everyone | Book the Office through a private step-by-step flow |
| `/bookings` | Everyone | Show the next 8 days of Bookings |
| `/unbook` | Everyone (Admins see all) | Delete a Booking |
| `/taco give`, `leaderboard`, `history` | Everyone | Give and view Tacos for a Season |
| `/taco-admin new-season`, `remove` | Admins (Manage Server) | Start a new Season, remove a Taco |

Domain terms are defined in `CONTEXT.md`.

## Development

```sh
pnpm install
pnpm test        # runs against a real local D1 inside the Workers runtime
pnpm typecheck
pnpm db:generate # after changing src/db/schema.ts
```

Account and secret setup is in `docs/setup.md`. Register slash commands globally with `pnpm register --global`, or for a test server with `DISCORD_GUILD_ID=<id> pnpm register`.

## Deploying

A push to `master` runs `.github/workflows/deploy.yml`: typecheck, tests, apply D1 migrations, `wrangler deploy`.
