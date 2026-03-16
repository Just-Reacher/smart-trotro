'use strict';

const db = require('../config/db');

/**
 * Write a record to system_logs.
 * Call anywhere: await writeLog({ userId, level, action, metadata })
 */
async function writeLog({ userId = null, level = 'info', action, metadata = null }) {
  try {
    await db.query(
      `INSERT INTO system_logs (user_id, level, action, metadata)
       VALUES ($1, $2, $3, $4)`,
      [userId, level, action, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    // Never let logging crash the main request
    console.error('[Logger] Failed to write log:', err.message);
  }
}

/**
 * Express middleware — logs every API request automatically.
 * Attach after routes to capture response status.
 */
function requestLogger(req, res, next) {
  res.on('finish', () => {
    const userId = req.user ? req.user.id : null;
    const level  = res.statusCode >= 500 ? 'error'
                 : res.statusCode >= 400 ? 'warning'
                 : 'info';
    writeLog({
      userId,
      level,
      action: `${req.method} ${req.originalUrl} — ${res.statusCode}`,
      metadata: { ip: req.ip, userAgent: req.headers['user-agent'] },
    });
  });
  next();
}

module.exports = { writeLog, requestLogger };
