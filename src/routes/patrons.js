const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/patrons", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.active,
              COALESCE(SUM(tl.delta), 0)::int AS tickets
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
    await db.query("INSERT INTO patrons (name) VALUES ($1)", [name]);
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

router.post("/patrons/:id/toggle", async (req, res, next) => {
  try {
    await db.query(
      "UPDATE patrons SET active = NOT active WHERE id = $1",
      [req.params.id]
    );
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

router.post("/patrons/:id/delete", async (req, res, next) => {
  try {
    await db.query("DELETE FROM patrons WHERE id = $1", [req.params.id]);
    res.redirect("/patrons");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
