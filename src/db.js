const { createClient } = require("@libsql/client");

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not set — copy .env.example to .env and fill it in.");
}
if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN is not set — copy .env.example to .env and fill it in.");
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  // Ticket counts and ids are always small — plain numbers keep templates
  // and arithmetic simple instead of dealing with BigInt everywhere.
  intMode: "number",
});

module.exports = {
  client,
  // sql: "... ? ..." with positional args, matching @libsql/client's convention.
  execute: (sql, args = []) => client.execute({ sql, args }),
};
