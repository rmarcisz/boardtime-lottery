const express = require("express");
const db = require("../db");
const months = require("../lib/months");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

async function getLatestMonth() {
  const { rows } = await db.execute(
    "SELECT year, month FROM months ORDER BY year DESC, month DESC LIMIT 1"
  );
  return rows[0] || null;
}

async function getEarliestMonth() {
  const { rows } = await db.execute(
    "SELECT year, month FROM months ORDER BY year ASC, month ASC LIMIT 1"
  );
  return rows[0] || null;
}

async function ticketsAsOf(year, month) {
  const { rows } = await db.execute(
    `SELECT p.id, p.name, p.active,
            COALESCE(SUM(tl.delta), 0) AS tickets
     FROM patrons p
     LEFT JOIN ticket_log tl
       ON tl.patron_id = p.id
       AND (tl.year * 12 + tl.month) <= (? * 12 + ?)
     GROUP BY p.id
     ORDER BY p.name ASC`,
    [year, month]
  );
  return rows;
}

async function winnersFor(year, month) {
  const { rows } = await db.execute(
    `SELECT p.name AS name, -tl.delta AS tickets_won, tl.created_at
     FROM ticket_log tl
     JOIN patrons p ON p.id = tl.patron_id
     WHERE tl.reason = 'win' AND tl.year = ? AND tl.month = ?
     ORDER BY tl.created_at ASC`,
    [year, month]
  );
  return rows;
}

router.get("/", async (req, res, next) => {
  try {
    const latest = await getLatestMonth();

    if (!latest) {
      // No month has ever been started — let the owner pick where the
      // ledger begins (e.g. matching when the patron program actually
      // started) instead of forcing today's calendar month.
      const today = months.todayYearMonth();
      return res.render("dashboard", {
        started: false,
        monthNames: months.POLISH_MONTHS,
        defaultYear: today.year,
        defaultMonth: today.month,
        yearOptions: [today.year - 1, today.year, today.year + 1],
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
    const tx = await db.client.transaction("write");
    try {
      const latestRs = await tx.execute(
        "SELECT year, month FROM months ORDER BY year DESC, month DESC LIMIT 1"
      );
      let target;
      if (latestRs.rows[0]) {
        // Already started — always advance by exactly one month. Any
        // year/month posted here (there shouldn't be any) is ignored, so
        // the ledger can't be made to skip or jump around.
        target = months.next(latestRs.rows[0]);
      } else {
        // First month ever — the owner picks where the ledger begins.
        const chosenYear = parseInt(req.body.year, 10);
        const chosenMonth = parseInt(req.body.month, 10);
        target =
          chosenYear && chosenMonth >= 1 && chosenMonth <= 12
            ? { year: chosenYear, month: chosenMonth }
            : months.todayYearMonth();
      }

      await tx.execute({
        sql: "INSERT INTO months (year, month) VALUES (?, ?)",
        args: [target.year, target.month],
      });

      const activeRs = await tx.execute("SELECT id FROM patrons WHERE active = 1");
      for (const p of activeRs.rows) {
        await tx.execute({
          sql: `INSERT INTO ticket_log (patron_id, year, month, delta, reason)
                VALUES (?, ?, ?, 1, 'monthly')`,
          args: [p.id, target.year, target.month],
        });
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
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

    const tx = await db.client.transaction("write");
    let outcome;
    try {
      const sumRs = await tx.execute({
        sql: `SELECT COALESCE(SUM(delta), 0) AS tickets
              FROM ticket_log
              WHERE patron_id = ? AND (year * 12 + month) <= (? * 12 + ?)`,
        args: [patronId, latest.year, latest.month],
      });
      const current = Number(sumRs.rows[0].tickets);

      if (current <= 0) {
        await tx.rollback();
        outcome = { ok: false, error: "Ten+patron+nie+ma+żadnych+kuponów" };
      } else {
        await tx.execute({
          sql: `INSERT INTO ticket_log (patron_id, year, month, delta, reason)
                VALUES (?, ?, ?, ?, 'win')`,
          args: [patronId, latest.year, latest.month, -current],
        });
        await tx.commit();
        outcome = { ok: true };
      }
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    res.redirect(outcome.ok ? "/" : `/?error=${outcome.error}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
