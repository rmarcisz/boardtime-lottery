const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/patrons", async (req, res, next) => {
  try {
    const { rows } = await db.execute(
      `SELECT p.id, p.name, p.active,
              COALESCE(SUM(tl.delta), 0) AS tickets
       FROM patrons p
       LEFT JOIN ticket_log tl ON tl.patron_id = p.id
       GROUP BY p.id
       ORDER BY p.active DESC, p.name ASC`
    );
    res.render("patrons", { patrons: rows, error: req.query.error || null });
  } catch (err) {
    next(err);
  }
});

router.post("/patrons", async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.redirect("/patrons?error=Podaj+imię+i+nazwisko");
    await db.execute("INSERT INTO patrons (name) VALUES (?)", [name]);
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

module.exports = router;
