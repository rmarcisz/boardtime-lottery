// Manual CLI wrapper around ensureSchema, for local use. The server also
// runs this automatically on startup, so this is mostly for convenience
// when you want to create the tables without starting the whole app.
require("dotenv").config();
const { ensureSchema } = require("./lib/ensureSchema");
const { pool } = require("./db");

ensureSchema()
  .then(() => {
    console.log("Schema is up to date.");
    return pool.end();
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
