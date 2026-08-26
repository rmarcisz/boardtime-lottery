const express = require("express");
const router = express.Router();

router.get("/login", (req, res) => {
  if (req.session && req.session.authed) return res.redirect("/");
  res.render("login", { error: null });
});

router.post("/login", (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.authed = true;
    return res.redirect("/");
  }
  res.status(401).render("login", { error: "Złe hasło." });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
