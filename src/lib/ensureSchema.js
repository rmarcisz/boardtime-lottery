const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await pool.query(sql);
}

module.exports = { ensureSchema };
