const express = require("express");
const db = require("../db");
const months = require("../lib/months");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function getLatestMonth() {
  const { rows } = await db.query(
    "SELECT year, month FROM months ORDER BY year DESC, month DESC LIMIT 1"
  );
  return rows[0] || null;
}

async function getEarliestMonth() {
  const { rows } = await db.query(
    "SELECT year, month FROM months ORDER BY year ASC, month ASC LIMIT 1"
  );
  return rows[0] || null;
}

async function ticketsAsOf(year, month) {
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.active,
            COALESCE(SUM(tl.delta), 0)::int AS tickets
     FROM patrons p
     LEFT JOIN ticket_log tl
       ON tl.patron_id = p.id
       AND (tl.year * 12 + tl.month) <= ($1::int * 12 + $2::int)
     GROUP BY p.id
     ORDER BY p.name ASC`,
    [year, month]
  );
  return rows;
}

async function winnersFor(year, month) {
  const { rows } = await db.query(
    `SELECT p.name AS name, -tl.delta AS tickets_won, tl.created_at
     FROM ticket_log tl
     JOIN patrons p ON p.id = tl.patron_id
     WHERE tl.reason = 'win' AND tl.year = $1 AND tl.month = $2
     ORDER BY tl.created_at ASC`,
    [year, month]
  );
  return rows;
}

router.get("/", async (req, res, next) => {
  try {
    const latest = await getLatestMonth();

    if (!latest) {
      // No month has ever been started — nothing to show yet.
      return res.render("dashboard", {
        started: false,
        firstMonthLabel: months.label(
          months.todayYearMonth().year,
          months.todayYearMonth().month
        ),
      });
    }

    const earliest = await getEarliestMonth();

    let year = parseInt(req.query.y, 10);
    let month = parseInt(req.query.m, 10);
    if (!year || !month) {
      year = latest.year;
      month = latest.month;
    }

    const isCurrent = year === latest.year && month === latest.month;
    const isEarliest = year === earliest.year && month === earliest.month;

    const patrons = await ticketsAsOf(year, month);
    const winners = await winnersFor(year, month);
    const prevYM = months.prev({ year, month });
    const nextYM = months.next({ year, month });

    res.render("dashboard", {
      started: true,
      year,
      month,
      label: months.label(year, month),
      isCurrent,
      isEarliest,
      prevYM,
      nextYM,
      patrons,
      winners,
      error: req.query.error || null,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/advance", async (req, res, next) => {
  try {
    await db.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const { rows } = await client.query(
          "SELECT year, month FROM months ORDER BY year DESC, month DESC LIMIT 1"
        );
        const target = rows[0] ? months.next(rows[0]) : months.todayYearMonth();

        await client.query(
          "INSERT INTO months (year, month) VALUES ($1, $2)",
          [target.year, target.month]
        );

        const active = await client.query(
          "SELECT id FROM patrons WHERE active = true"
        );
        for (const p of active.rows) {
          await client.query(
            `INSERT INTO ticket_log (patron_id, year, month, delta, reason)
             VALUES ($1, $2, $3, 1, 'monthly')`,
            [p.id, target.year, target.month]
          );
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

router.post("/declare-winner", async (req, res, next) => {
  try {
    const patronId = parseInt(req.body.patron_id, 10);
    if (!patronId) return res.redirect("/?error=Wybierz+patrona");

    const latest = await getLatestMonth();
    if (!latest) return res.redirect("/?error=Najpierw+rozpocznij+miesiąc");

    const outcome = await db.withClient(async (client) => {
      await client.query("BEGIN");
      try {
        const { rows } = await client.query(
          `SELECT COALESCE(SUM(delta), 0)::int AS tickets
           FROM ticket_log
           WHERE patron_id = $1 AND (year * 12 + month) <= ($2::int * 12 + $3::int)`,
          [patronId, latest.year, latest.month]
        );
        const current = rows[0].tickets;

        if (current <= 0) {
          await client.query("ROLLBACK");
          return { ok: false, error: "Ten+patron+nie+ma+żadnych+kuponów" };
        }

        await client.query(
          `INSERT INTO ticket_log (patron_id, year, month, delta, reason)
           VALUES ($1, $2, $3, $4, 'win')`,
          [patronId, latest.year, latest.month, -current]
        );

        await client.query("COMMIT");
        return { ok: true };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });

    res.redirect(outcome.ok ? "/" : `/?error=${outcome.error}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
