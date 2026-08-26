# boardtimes-lottery

A tiny internal tool for running boardtimes.pl's monthly patron lottery.

## How it works

- **Patrons** are added manually (Patroni page).
- Once a month, you click **"następny miesiąc"** — every active patron gets
  +1 ticket. Nothing happens automatically; you control the pace.
- The site just shows you **ticket totals per patron** so you can run the
  actual random draw yourself, however you like (physical raffle, dice, an
  external picker — whatever). The site doesn't pick winners for you.
- After you know who won, click **"wygrał"** next to their name. That resets
  their ticket count to zero — everyone else keeps what they had.
- Use the **← / →** arrows to browse past months and see historical totals
  and who won that month. Only the current (latest) month lets you declare a
  winner or advance further — past months are read-only.

## Local setup

1. Create a database with the [Turso CLI](https://docs.turso.tech/cli/introduction):
   ```
   turso db create boardtimes-lottery
   turso db show boardtimes-lottery --url
   turso db tokens create boardtimes-lottery
   ```
2. `npm install`
3. `cp .env.example .env` and fill in `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
   `ADMIN_PASSWORD`, `SESSION_SECRET`.
4. `npm run dev` — the server creates its tables automatically on startup
   (safe to run repeatedly, nothing is dropped).
5. Visit `http://localhost:3000`, log in with `ADMIN_PASSWORD`.

## Deploying to Render

This repo includes a `render.yaml` Blueprint — in the Render dashboard, use
**New → Blueprint**, point it at this repo, and it will provision a **Web
Service** running the app. You'll be prompted for the secrets that aren't
auto-generated: `ADMIN_PASSWORD`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
`SESSION_SECRET` is generated for you.

To add or change these later without redeploying from the Blueprint: Render
dashboard → the service → **Environment** tab → **Add Environment Variable**.
Saving triggers a redeploy automatically.

Turso's free tier (500 databases, generous row/storage limits) comfortably
covers a dataset this small, with no expiry to worry about.

## Notes on the data model

Nothing is denormalized — every ticket change (monthly grant, win reset) is
one row in `ticket_log`. A patron's ticket count for any month is just the
sum of their log rows up to that month, which is also how historical months
are reconstructed when you browse backward.

Deleting a patron deletes their history with them (done explicitly in code,
since Turso's per-request HTTP connections make relying on SQLite's
`ON DELETE CASCADE` unreliable). If you just want them to stop receiving
monthly tickets but keep their record, use **dezaktywuj** instead.
