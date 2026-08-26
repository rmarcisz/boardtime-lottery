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

1. Install Postgres locally (or point `DATABASE_URL` at any Postgres instance).
2. `npm install`
3. `cp .env.example .env` and fill in `DATABASE_URL`, `ADMIN_PASSWORD`,
   `SESSION_SECRET`.
4. `npm run dev` — the server creates its tables automatically on startup
   (safe to run repeatedly, nothing is dropped).
5. Visit `http://localhost:3000`, log in with `ADMIN_PASSWORD`.

## Deploying to Render

This repo includes a `render.yaml` Blueprint — in the Render dashboard, use
**New → Blueprint**, point it at this repo, and it will provision:

- a **Web Service** running this app
- a **Postgres** database, wired up via `DATABASE_URL` automatically

You'll be prompted to set `ADMIN_PASSWORD` (the one secret not auto-generated).
`SESSION_SECRET` is generated for you by Render.

Render's free Postgres tier is time-limited (currently expires after 30 days
and needs manual renewal, or upgrade to a paid instance) — check Render's
current policy before relying on the free tier long-term, since this tool's
whole point is holding onto data across many months.

## Notes on the data model

Nothing is denormalized — every ticket change (monthly grant, win reset) is
one row in `ticket_log`. A patron's ticket count for any month is just the
sum of their log rows up to that month, which is also how historical months
are reconstructed when you browse backward.

Deleting a patron deletes their history with them. If you just want them to
stop receiving monthly tickets but keep their record, use **dezaktywuj**
instead.
