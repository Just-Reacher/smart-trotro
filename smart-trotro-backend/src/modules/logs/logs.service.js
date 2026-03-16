'use strict';

const db = require('../../config/db');

async function getLogs({ level, limit = 100, offset = 0 } = {}) {
  const cond   = level ? `AND sl.level = $3` : '';
  const params = level ? [limit, offset, level] : [limit, offset];

  const result = await db.query(
    `SELECT sl.id, sl.level, sl.action, sl.metadata, sl.created_at,
            u.first_name || ' ' || u.last_name AS user_name, u.email, u.role
     FROM system_logs sl
     LEFT JOIN users u ON u.id = sl.user_id
     WHERE 1=1 ${cond}
     ORDER BY sl.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

async function getLogStats() {
  const result = await db.query(
    `SELECT level, COUNT(*) AS count
     FROM system_logs
     WHERE created_at >= NOW() - INTERVAL '24 hours'
     GROUP BY level`
  );
  return result.rows;
}

module.exports = { getLogs, getLogStats };
