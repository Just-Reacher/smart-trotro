'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'smart_trotro',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'Master299',
  // Keep pool small for development; tune for production
  max:                20,
  idleTimeoutMillis:  30000,
  connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('  ✗ PostgreSQL connection failed:', err.message);
    return;
  }
  client.query('SELECT NOW()', (queryErr) => {
    release();
    if (queryErr) {
      console.error('  ✗ PostgreSQL test query failed:', queryErr.message);
    } else {
      console.log('  ✓ PostgreSQL connected successfully');
    }
  });
});

/**
 * Run a single query.
 * @param {string} text   - SQL string (use $1, $2 … placeholders)
 * @param {Array}  params - Values array
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
      console.log(`  [DB] ${Date.now() - start}ms — ${text.substring(0, 60)}`);
    }
    return result;
  } catch (err) {
    console.error('  [DB] Query error:', err.message, '\n  SQL:', text);
    throw err;
  }
}

/**
 * Grab a client for manual transactions.
 * Always call client.release() in a finally block.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
