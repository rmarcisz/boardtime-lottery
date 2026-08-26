-- Patrons of boardtimes.pl, entered manually by the site owner.
CREATE TABLE IF NOT EXISTS patrons (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per month that has been "advanced to". The row with the highest
-- (year, month) is the current month; advancing creates the next row and
-- grants a monthly ticket to every active patron in the same transaction.
CREATE TABLE IF NOT EXISTS months (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

-- Full audit trail of every ticket change. A patron's ticket count for any
-- month is SUM(delta) over all rows up to and including that month — this
-- table is the single source of truth; nothing is denormalized.
CREATE TABLE IF NOT EXISTS ticket_log (
  id SERIAL PRIMARY KEY,
  patron_id INTEGER NOT NULL REFERENCES patrons(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('monthly', 'win', 'adjust')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_log_patron ON ticket_log (patron_id);
CREATE INDEX IF NOT EXISTS idx_ticket_log_month ON ticket_log (year, month);
