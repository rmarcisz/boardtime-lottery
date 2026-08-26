const fs = require("fs");
const path = require("path");
const { client } = require("../db");

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await client.executeMultiple(sql);
  await migrateActiveSince();
}

// Added after the first deploy — CREATE TABLE IF NOT EXISTS above doesn't
// touch a patrons table that already exists, so add the columns by hand
// for databases created before this feature existed. Both steps are
// idempotent: ADD COLUMN is skipped once the column is there, and the
// UPDATE only ever touches rows that still need backfilling.
async function migrateActiveSince() {
  const info = await client.execute("PRAGMA table_info(patrons)");
  const columns = info.rows.map((r) => r.name);

  if (!columns.includes("active_since_year")) {
    await client.execute("ALTER TABLE patrons ADD COLUMN active_since_year INTEGER");
  }
  if (!columns.includes("active_since_month")) {
    await client.execute("ALTER TABLE patrons ADD COLUMN active_since_month INTEGER");
  }

  await client.execute(`
    UPDATE patrons
    SET active_since_year = CAST(strftime('%Y', created_at) AS INTEGER),
        active_since_month = CAST(strftime('%m', created_at) AS INTEGER)
    WHERE active_since_year IS NULL OR active_since_month IS NULL
  `);
}

module.exports = { ensureSchema };
