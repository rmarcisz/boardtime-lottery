-- Patrons of boardtimes.pl, entered manually by the site owner.
-- active_since_year/month gates monthly grants (see /advance in
-- dashboard.js): a patron only receives a ticket for months on or after
-- this one, even while active = 1. Nullable so existing rows migrate
-- cleanly — ensureSchema.js backfills them from created_at.
CREATE TABLE IF NOT EXISTS patrons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  active_since_year INTEGER,
  active_since_month INTEGER CHECK (active_since_month IS NULL OR active_since_month BETWEEN 1 AND 12),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per month that has been "advanced to". The row with the highest
-- (year, month) is the current month; advancing creates the next row and
-- grants a monthly ticket to every active patron in the same transaction.
CREATE TABLE IF NOT EXISTS months (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (year, month)
);

-- Full audit trail of every ticket change. A patron's ticket count for any
-- month is SUM(delta) over all rows up to and including that month — this
-- table is the single source of truth; nothing is denormalized. Deleting a
-- patron (see patrons.js) explicitly deletes their rows here too — Turso's
-- HTTP-per-request connections make relying on ON DELETE CASCADE unreliable.
CREATE TABLE IF NOT EXISTS ticket_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patron_id INTEGER NOT NULL REFERENCES patrons(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('monthly', 'win', 'adjust')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ticket_log_patron ON ticket_log (patron_id);
CREATE INDEX IF NOT EXISTS idx_ticket_log_month ON ticket_log (year, month);
