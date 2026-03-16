'use strict';

const REQUIRED = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`\n  Missing required environment variables:\n  ${missing.join(', ')}\n`);
    console.error('  Copy .env.example → .env and fill in the values.\n');
    process.exit(1);
  }
}

module.exports = { validateEnv };
