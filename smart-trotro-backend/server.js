'use strict';

require('dotenv').config();
const app    = require('./src/app');
const { validateEnv } = require('./src/config/env');

// ── Validate required env vars before starting ──────────────────────────────
validateEnv();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║      Smart Trotro Backend — Running      ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log(`  ► Environment : ${process.env.NODE_ENV}`);
  console.log(`  ► Port        : ${PORT}`);
  console.log(`  ► API Base    : http://localhost:${PORT}/api`);
  console.log('');
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err.message);
  server.close(() => process.exit(1));
});