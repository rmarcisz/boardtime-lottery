const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env and fill it in.");
}

// Render's managed Postgres requires SSL but uses a self-signed cert chain,
// so we accept it without strict verification (standard practice for
// Render/Heroku-style hosted Postgres).
const useSsl = process.env.DATABASE_URL.includes("render.com") || process.env.PGSSL === "true";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  withClient: async (fn) => {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  },
  pool,
};
