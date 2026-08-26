const express = require("express");
const db = require("../db");
const months = require("../lib/months");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/patrons", async (req, res, next) => {
  try {
    const { rows } = await db.execute(
      `SELECT p.id, p.name, p.active, p.active_since_year, p.active_since_month,
              COALESCE(SUM(tl.delta), 0) AS tickets
       FROM patrons p
       LEFT JOIN ticket_log tl ON tl.patron_id = p.id
       GROUP BY p.id
       ORDER BY p.active DESC, p.name ASC`
    );
    const today = months.todayYearMonth();
    res.render("patrons", {
      patrons: rows,
      error: req.query.error || null,
      cleared: req.query.cleared === "1",
      monthNames: months.POLISH_MONTHS,
      yearOptions: [today.year - 2, today.year - 1, today.year, today.year + 1, today.year + 2],
    });
  } catch (err) {
    next(err);
  }
});

router.post("/patrons", async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.redirect("/patrons?error=Podaj+imię+i+nazwisko");

    // New patrons start being eligible from the ledger's current month
    // (or today, if no month has started yet) — editable afterward.
    const latestRs = await db.execute(
      "SELECT year, month FROM months ORDER BY year DESC, month DESC LIMIT 1"
    );
    const start = latestRs.rows[0] || months.todayYearMonth();

    await db.execute(
      "INSERT INTO patrons (name, active_since_year, active_since_month) VALUES (?, ?, ?)",
      [name, start.year, start.month]
    );
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

router.post("/patrons/:id/active-since", async (req, res, next) => {
  try {
    const year = parseInt(req.body.year, 10);
    const month = parseInt(req.body.month, 10);
    if (!year || !month || month < 1 || month > 12) {
      return res.redirect("/patrons?error=Nieprawidłowa+data");
    }
    await db.execute(
      "UPDATE patrons SET active_since_year = ?, active_since_month = ? WHERE id = ?",
      [year, month, req.params.id]
    );
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

router.post("/patrons/:id/toggle", async (req, res, next) => {
  try {
    await db.execute(
      "UPDATE patrons SET active = 1 - active WHERE id = ?",
      [req.params.id]
    );
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

router.post("/patrons/:id/delete", async (req, res, next) => {
  try {
    // No reliable ON DELETE CASCADE across Turso's per-request connections —
    // delete the patron's ticket history explicitly, in the same batch.
    await db.client.batch(
      [
        { sql: "DELETE FROM ticket_log WHERE patron_id = ?", args: [req.params.id] },
        { sql: "DELETE FROM patrons WHERE id = ?", args: [req.params.id] },
      ],
      "write"
    );
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

router.post("/admin/clear-database", async (req, res, next) => {
  try {
    // Wipes everything — patrons, months, and the whole ticket ledger.
    // Guarded client-side by a typed confirmation phrase; nothing here
    // double-checks that server-side since this is a single-password
    // internal tool, but the action itself is intentionally all-or-nothing
    // (no soft-delete) so there's nothing to leave half-cleared.
    await db.client.batch(
      [
        { sql: "DELETE FROM ticket_log", args: [] },
        { sql: "DELETE FROM months", args: [] },
        { sql: "DELETE FROM patrons", args: [] },
      ],
      "write"
    );
    res.redirect("/patrons?cleared=1");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
