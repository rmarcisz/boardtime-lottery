const fs = require("fs");
const path = require("path");
const { client } = require("../db");

async function ensureSchema() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  await client.executeMultiple(sql);
}

module.exports = { ensureSchema };
