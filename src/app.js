require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const patronsRoutes = require("./routes/patrons");
const { ensureSchema } = require("./lib/ensureSchema");

const app = express();

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not set — copy .env.example to .env and fill it in.");
}
if (!process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_PASSWORD is not set — copy .env.example to .env and fill it in.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.set("trust proxy", 1); // Render sits behind a proxy; needed for secure cookies

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  })
);

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(patronsRoutes);

app.use((req, res) => {
  res.status(404).send("Nie znaleziono strony.");
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Coś poszło nie tak. Spróbuj ponownie.");
});

const port = process.env.PORT || 3000;

ensureSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`boardtimes-lottery listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to set up the database schema:", err);
    process.exit(1);
  });
