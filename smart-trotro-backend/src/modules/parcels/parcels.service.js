'use strict';

const db = require('../../config/db');
const { writeLog } = require('../../middleware/logger');

// ── Passenger: create parcel request ─────────────────────────────────────────
async function createParcel({ senderId, pickupLocation, dropLocation, description, receiverContact, deliveryFee }) {
  const result = await db.query(
    `INSERT INTO parcels (sender_id, pickup_location, drop_location, description, receiver_contact, delivery_fee)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [senderId, pickupLocation, dropLocation, description, receiverContact, deliveryFee || 0]
  );
  await writeLog({ userId: senderId, level: 'info', action: `Parcel created: ${result.rows[0].id}` });
  return result.rows[0];
}

// ── Driver: available requests (pending, not yet assigned) ────────────────────
async function getAvailableRequests() {
  const result = await db.query(
    `SELECT p.id, p.pickup_location, p.drop_location, p.description,
            p.receiver_contact, p.delivery_fee, p.status, p.created_at,
            u.first_name || ' ' || u.last_name AS sender_name
     FROM parcels p
     JOIN users u ON u.id = p.sender_id
     WHERE p.status = 'pending'
     ORDER BY p.created_at ASC`
  );
  return result.rows;
}

// ── Driver: my assigned parcels ───────────────────────────────────────────────
async function getDriverParcels(driverId) {
  const result = await db.query(
    `SELECT p.id, p.pickup_location, p.drop_location, p.description,
            p.receiver_contact, p.delivery_fee, p.status, p.created_at, p.updated_at,
            u.first_name || ' ' || u.last_name AS sender_name, u.phone AS sender_phone
     FROM parcels p
     JOIN users u ON u.id = p.sender_id
     WHERE p.driver_id = $1 AND p.status NOT IN ('delivered','declined','cancelled')
     ORDER BY p.updated_at DESC`,
    [driverId]
  );
  return result.rows;
}

// ── Passenger: their own parcels ──────────────────────────────────────────────
async function getSenderParcels(senderId) {
  const result = await db.query(
    `SELECT p.id, p.pickup_location, p.drop_location, p.description,
            p.receiver_contact, p.delivery_fee, p.status, p.created_at, p.updated_at,
            u.first_name || ' ' || u.last_name AS driver_name, u.phone AS driver_phone
     FROM parcels p
     LEFT JOIN users u ON u.id = p.driver_id
     WHERE p.sender_id = $1
     ORDER BY p.created_at DESC`,
    [senderId]
  );
  return result.rows;
}

// ── Track by parcel ID (public-ish, anyone with ID) ───────────────────────────
async function trackParcel(parcelId) {
  const result = await db.query(
    `SELECT p.id, p.pickup_location, p.drop_location, p.status, p.created_at, p.updated_at,
            p.delivery_fee,
            u.first_name || ' ' || u.last_name AS driver_name,
            vl.latitude, vl.longitude
     FROM parcels p
     LEFT JOIN users u ON u.id = p.driver_id
     LEFT JOIN vehicle_locations vl ON vl.driver_id = p.driver_id
     WHERE p.id = $1`,
    [parcelId]
  );
  if (!result.rows.length) {
    const err = new Error('Parcel not found'); err.status = 404; throw err;
  }
  return result.rows[0];
}

// ── Driver: accept ────────────────────────────────────────────────────────────
async function acceptParcel(parcelId, driverId) {
  const result = await db.query(
    `UPDATE parcels SET driver_id = $1, status = 'accepted', updated_at = NOW()
     WHERE id = $2 AND status = 'pending'
     RETURNING *`,
    [driverId, parcelId]
  );
  if (!result.rows.length) {
    const err = new Error('Parcel not found or already taken'); err.status = 409; throw err;
  }
  await writeLog({ userId: driverId, level: 'info', action: `Driver accepted parcel: ${parcelId}` });
  return result.rows[0];
}

// ── Driver: decline ───────────────────────────────────────────────────────────
async function declineParcel(parcelId, driverId) {
  const result = await db.query(
    `UPDATE parcels SET status = 'declined', updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'accepted'
     RETURNING *`,
    [parcelId, driverId]
  );
  if (!result.rows.length) {
    const err = new Error('Parcel not found or not assigned to you'); err.status = 404; throw err;
  }
  await writeLog({ userId: driverId, level: 'warning', action: `Driver declined parcel: ${parcelId}` });
  return result.rows[0];
}

// ── Driver: mark picked up ────────────────────────────────────────────────────
async function markPickedUp(parcelId, driverId) {
  const result = await db.query(
    `UPDATE parcels SET status = 'picked_up', updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'accepted'
     RETURNING *`,
    [parcelId, driverId]
  );
  if (!result.rows.length) {
    const err = new Error('Parcel not found or not in accepted state'); err.status = 404; throw err;
  }
  await writeLog({ userId: driverId, level: 'info', action: `Parcel picked up: ${parcelId}` });
  return result.rows[0];
}

// ── Driver: mark delivered ────────────────────────────────────────────────────
async function markDelivered(parcelId, driverId) {
  const parcel = await db.query(
    `UPDATE parcels SET status = 'delivered', updated_at = NOW()
     WHERE id = $1 AND driver_id = $2 AND status = 'picked_up'
     RETURNING *`,
    [parcelId, driverId]
  );
  if (!parcel.rows.length) {
    const err = new Error('Parcel not found or not in picked_up state'); err.status = 404; throw err;
  }

  // Auto-create a completed transaction for the delivery fee
  if (parcel.rows[0].delivery_fee > 0) {
    await db.query(
      `INSERT INTO transactions (user_id, parcel_id, amount, payment_method, type, status)
       VALUES ($1, $2, $3, 'cash', 'parcel_delivery', 'completed')`,
      [driverId, parcelId, parcel.rows[0].delivery_fee]
    );
  }

  await writeLog({ userId: driverId, level: 'success', action: `Parcel delivered: ${parcelId}` });
  return parcel.rows[0];
}

// ── Admin: all parcels ────────────────────────────────────────────────────────
async function getAllParcels({ status, limit = 50, offset = 0 } = {}) {
  const cond   = status ? `WHERE p.status = $3` : '';
  const params = status ? [limit, offset, status] : [limit, offset];

  const result = await db.query(
    `SELECT p.id, p.pickup_location, p.drop_location, p.description,
            p.delivery_fee, p.status, p.created_at,
            s.first_name || ' ' || s.last_name AS sender_name,
            d.first_name || ' ' || d.last_name AS driver_name
     FROM parcels p
     JOIN users s ON s.id = p.sender_id
     LEFT JOIN users d ON d.id = p.driver_id
     ${cond}
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

module.exports = {
  createParcel, getAvailableRequests, getDriverParcels, getSenderParcels,
  trackParcel, acceptParcel, declineParcel, markPickedUp, markDelivered, getAllParcels,
};
