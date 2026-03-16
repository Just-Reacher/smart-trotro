'use strict';

const db = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

// ── Passenger: their transactions ────────────────────────────────────────────
async function getUserTransactions(userId, { limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT t.id, t.amount, t.payment_method, t.type, t.status, t.reference, t.created_at,
            r.route_name,
            p.pickup_location, p.drop_location
     FROM transactions t
     LEFT JOIN trips   tr ON tr.id = t.trip_id
     LEFT JOIN routes  r  ON r.id  = tr.route_id
     LEFT JOIN parcels p  ON p.id  = t.parcel_id
     WHERE t.user_id = $1
     ORDER BY t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

// ── Create a transaction (fare payment) ───────────────────────────────────────
async function createTransaction({ userId, tripId, parcelId, amount, paymentMethod, type, reference }) {
  const result = await db.query(
    `INSERT INTO transactions (user_id, trip_id, parcel_id, amount, payment_method, type, reference, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
     RETURNING *`,
    [userId, tripId || null, parcelId || null, amount, paymentMethod, type || 'fare', reference || null]
  );
  await writeLog({
    userId,
    level:  'success',
    action: `Transaction created: GHS ${amount} via ${paymentMethod}`,
  });
  return result.rows[0];
}

// ── Admin: all transactions ───────────────────────────────────────────────────
async function getAllTransactions({ limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT t.id, t.amount, t.payment_method, t.type, t.status, t.reference, t.created_at,
            u.first_name || ' ' || u.last_name AS user_name, u.email
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

// ── Transaction summary for a user ───────────────────────────────────────────
async function getTransactionSummary(userId) {
  const result = await db.query(
    `SELECT
       COUNT(*)                                          AS total_count,
       COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_spent,
       COALESCE(SUM(amount) FILTER (
         WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
       ), 0) AS spent_this_month
     FROM transactions
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

module.exports = {
  getUserTransactions, createTransaction, getAllTransactions, getTransactionSummary,
};
