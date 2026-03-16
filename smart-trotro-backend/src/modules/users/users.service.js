'use strict';

const bcrypt = require('bcryptjs');
const db     = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ── Get user profile ──────────────────────────────────────────────────────────
async function getProfile(userId) {
  const result = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status, u.created_at,
            dp.vehicle_number, dp.approval_status AS driver_approval,
            dp.is_online, dp.license_number,
            r.route_name AS primary_route,
            ap.organisation, ap.department, ap.approval_status AS admin_approval
     FROM users u
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN routes           r  ON r.id = dp.primary_route_id
     LEFT JOIN admin_profiles   ap ON ap.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found'); err.status = 404; throw err;
  }
  return result.rows[0];
}

// ── Update user profile ───────────────────────────────────────────────────────
async function updateProfile(userId, { firstName, lastName, phone }) {
  const result = await db.query(
    `UPDATE users SET
       first_name = COALESCE($1, first_name),
       last_name  = COALESCE($2, last_name),
       phone      = COALESCE($3, phone),
       updated_at = NOW()
     WHERE id = $4
     RETURNING id, first_name, last_name, email, phone, role, status`,
    [firstName, lastName, phone, userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found'); err.status = 404; throw err;
  }
  await writeLog({ userId, level: 'info', action: 'User updated their profile' });
  return result.rows[0];
}

// ── Change password ───────────────────────────────────────────────────────────
async function changePassword(userId, { currentPassword, newPassword }) {
  const result = await db.query(
    `SELECT password_hash FROM users WHERE id = $1`, [userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found'); err.status = 404; throw err;
  }

  const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!match) {
    const err = new Error('Current password is incorrect'); err.status = 401; throw err;
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, userId]
  );
  await writeLog({ userId, level: 'warning', action: 'User changed their password' });
}

// ── Update driver profile extras ──────────────────────────────────────────────
async function updateDriverProfile(userId, { vehicleNumber, primaryRouteId, licenseNumber }) {
  const result = await db.query(
    `UPDATE driver_profiles SET
       vehicle_number   = COALESCE($1, vehicle_number),
       primary_route_id = COALESCE($2, primary_route_id),
       license_number   = COALESCE($3, license_number),
       updated_at       = NOW()
     WHERE user_id = $4
     RETURNING *`,
    [vehicleNumber, primaryRouteId || null, licenseNumber, userId]
  );
  if (!result.rows.length) {
    const err = new Error('Driver profile not found'); err.status = 404; throw err;
  }
  await writeLog({ userId, level: 'info', action: 'Driver updated their vehicle profile' });
  return result.rows[0];
}

module.exports = { getProfile, updateProfile, changePassword, updateDriverProfile };
