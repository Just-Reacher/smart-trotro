'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ── Register ──────────────────────────────────────────────────────────────────
async function register({ firstName, lastName, email, phone, password, role,
                           vehicleNumber, primaryRouteId,
                           organisation, department, accessCode }) {
  // Check for existing email / phone
  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1',
    [email, phone]
  );
  if (existing.rows.length) {
    const err = new Error('Email or phone number already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Insert base user — start transaction for multi-table inserts
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, first_name, last_name, email, phone, role, status, created_at`,
      [firstName, lastName, email, phone, passwordHash, role,
       role === 'admin' ? 'pending' : 'active']
    );
    const user = userResult.rows[0];

    // Insert role-specific profile
    if (role === 'driver') {
      await client.query(
        `INSERT INTO driver_profiles (user_id, vehicle_number, primary_route_id)
         VALUES ($1, $2, $3)`,
        [user.id, vehicleNumber || null, primaryRouteId || null]
      );
    } else if (role === 'admin') {
      await client.query(
        `INSERT INTO admin_profiles (user_id, organisation, department, access_code)
         VALUES ($1, $2, $3, $4)`,
        [user.id, organisation || null, department || null, accessCode || null]
      );
    }

    await client.query('COMMIT');

    await writeLog({
      userId: user.id,
      level:  'success',
      action: `User registered as ${role}: ${email}`,
    });

    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login({ email, password }) {
  const result = await db.query(
    `SELECT id, first_name, last_name, email, phone, role, status, password_hash
     FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );

  if (!result.rows.length) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const user = result.rows[0];

  if (user.status === 'suspended') {
    const err = new Error('Account suspended. Contact support.');
    err.status = 403;
    throw err;
  }

  if (user.status === 'pending') {
    const err = new Error('Account pending approval. Please wait for admin review.');
    err.status = 403;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  await writeLog({
    userId: user.id,
    level:  'info',
    action: `User logged in: ${email}`,
  });

  const { password_hash, ...safeUser } = user;
  return { user: safeUser, token };
}

// ── Get current user ──────────────────────────────────────────────────────────
async function getMe(userId) {
  const result = await db.query(
    `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.status, u.created_at,
            dp.vehicle_number, dp.primary_route_id, dp.approval_status AS driver_approval, dp.is_online,
            ap.organisation, ap.department, ap.approval_status AS admin_approval
     FROM users u
     LEFT JOIN driver_profiles dp ON dp.user_id = u.id
     LEFT JOIN admin_profiles  ap ON ap.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  if (!result.rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  return result.rows[0];
}

module.exports = { register, login, getMe };
