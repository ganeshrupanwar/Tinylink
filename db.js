require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  const result = await pool.query('SELECT NOW() AS now');
  console.log('✅ DB connected at:', result.rows[0].now);
}

module.exports = {
  pool,
  testConnection,
};
