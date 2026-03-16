'use strict';

const db = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

// ── Dashboard stats ───────────────────────────────────────────────────────────
async function getStats() {
  const [drivers, passengers, routes, parcels, deliveries, transactions] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM users WHERE role = 'driver'`),
    db.query(`SELECT COUNT(*) FROM users WHERE role = 'passenger'`),
    db.query(`SELECT COUNT(*) FROM routes WHERE status = 'active'`),
    db.query(`SELECT COUNT(*) FROM parcels`),
    db.query(`SELECT COUNT(*) FROM parcels WHERE status = 'delivered'`),
    db.query(`SELECT COUNT(*) FROM transactions`),
  ]);

  return {
    totalDrivers:         parseInt(drivers.rows[0].count,       10),
    totalPassengers:      parseInt(passengers.rows[0].count,    10),
    activeRoutes:         parseInt(routes.rows[0].count,        10),
    totalParcels:         parseInt(parcels.rows[0].count,       10),
    completedDeliveries:  parseInt(deliveries.rows[0].count,    10),
    totalTransactions:    parseInt(transactions.rows[0].count,  10),
  };
}

// ── All drivers ───────────────────────────────────────────────────────────────
async function getDrivers({ search = '', limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.created_at,
            dp.vehicle_number, dp.approval_status, dp.is_online,
            r.route_name AS primary_route
     FROM users u
     JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN routes r ON r.id = dp.primary_route_id
     WHERE u.role = 'driver'
       AND (
         u.first_name ILIKE $1 OR u.last_name ILIKE $1
         OR u.email ILIKE $1 OR dp.vehicle_number ILIKE $1
       )
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );
  return result.rows;
}

// ── Approve driver ────────────────────────────────────────────────────────────
async function approveDriver(driverId, adminId) {
  const result = await db.query(
    `UPDATE driver_profiles SET approval_status = 'approved', updated_at = NOW()
     WHERE user_id = $1
     RETURNING user_id`,
    [driverId]
  );
  if (!result.rows.length) {
    const err = new Error('Driver not found'); err.status = 404; throw err;
  }
  // Also set user status to active
  await db.query(`UPDATE users SET status = 'active' WHERE id = $1`, [driverId]);
  await writeLog({ userId: adminId, level: 'success', action: `Admin approved driver: ${driverId}` });
}

// ── Suspend driver ────────────────────────────────────────────────────────────
async function suspendDriver(driverId, adminId) {
  const result = await db.query(
    `UPDATE users SET status = 'suspended', updated_at = NOW()
     WHERE id = $1 AND role = 'driver' RETURNING id`,
    [driverId]
  );
  if (!result.rows.length) {
    const err = new Error('Driver not found'); err.status = 404; throw err;
  }
  await writeLog({ userId: adminId, level: 'warning', action: `Admin suspended driver: ${driverId}` });
}

// ── Remove driver ─────────────────────────────────────────────────────────────
async function removeDriver(driverId, adminId) {
  const result = await db.query(
    `DELETE FROM users WHERE id = $1 AND role = 'driver' RETURNING id`,
    [driverId]
  );
  if (!result.rows.length) {
    const err = new Error('Driver not found'); err.status = 404; throw err;
  }
  await writeLog({ userId: adminId, level: 'warning', action: `Admin removed driver: ${driverId}` });
}

// ── All passengers ────────────────────────────────────────────────────────────
async function getPassengers({ search = '', limit = 50, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT id, first_name, last_name, email, phone, status, created_at
     FROM users
     WHERE role = 'passenger'
       AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [`%${search}%`, limit, offset]
  );
  return result.rows;
}

// ── Suspend passenger ─────────────────────────────────────────────────────────
async function suspendPassenger(passengerId, adminId) {
  const result = await db.query(
    `UPDATE users SET status = 'suspended' WHERE id = $1 AND role = 'passenger' RETURNING id`,
    [passengerId]
  );
  if (!result.rows.length) {
    const err = new Error('Passenger not found'); err.status = 404; throw err;
  }
  await writeLog({ userId: adminId, level: 'warning', action: `Admin suspended passenger: ${passengerId}` });
}

// ── Remove passenger ──────────────────────────────────────────────────────────
async function removePassenger(passengerId, adminId) {
  const result = await db.query(
    `DELETE FROM users WHERE id = $1 AND role = 'passenger' RETURNING id`,
    [passengerId]
  );
  if (!result.rows.length) {
    const err = new Error('Passenger not found'); err.status = 404; throw err;
  }
  await writeLog({ userId: adminId, level: 'warning', action: `Admin removed passenger: ${passengerId}` });
}

// ── All payments ──────────────────────────────────────────────────────────────
async function getPayments({ limit = 50, offset = 0 } = {}) {
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

module.exports = {
  getStats, getDrivers, approveDriver, suspendDriver, removeDriver,
  getPassengers, suspendPassenger, removePassenger, getPayments,
};
