const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function main() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    const result = await client.query('SELECT NOW()');
    console.log('Current time from DB:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('Database connection error:', err.message);
  }
}

main();
