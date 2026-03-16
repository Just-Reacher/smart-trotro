// seed.js
// Inserts: 1 admin, 5 passengers, 2 drivers + all related profile/route/fare data
// Run: node seed.js

'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'smart_trotro',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const ROUNDS = 10;

/* ─────────────────────────────────────────────────────────────────────────────
   SEED DATA DEFINITIONS
───────────────────────────────────────────────────────────────────────────── */

const ADMIN = {
  first_name:   'Kofi',
  last_name:    'Mensah',
  email:        'admin@smarttrotro.com',
  phone:        '+233200000001',
  password:     'Admin@2024!',
  role:         'admin',
  status:       'active',
  organisation: 'Smart Trotro Operations',
  department:   'Platform Administration',
  access_code:  'ADMIN2024',
  approval_status: 'approved',
};

const PASSENGERS = [
  { first_name: 'Abena',   last_name: 'Owusu',   email: 'abena.owusu@gmail.com',   phone: '+233201111001', password: 'Pass@1234' },
  { first_name: 'Kwame',   last_name: 'Asante',   email: 'kwame.asante@gmail.com',  phone: '+233201111002', password: 'Pass@1234' },
  { first_name: 'Akosua',  last_name: 'Boateng',  email: 'akosua.boateng@yahoo.com',phone: '+233201111003', password: 'Pass@1234' },
  { first_name: 'Yaw',     last_name: 'Darko',    email: 'yaw.darko@outlook.com',   phone: '+233201111004', password: 'Pass@1234' },
  { first_name: 'Ama',     last_name: 'Adjei',    email: 'ama.adjei@gmail.com',     phone: '+233201111005', password: 'Pass@1234' },
];

const DRIVERS = [
  {
    first_name:     'Kojo',
    last_name:      'Appiah',
    email:          'kojo.appiah@smarttrotro.com',
    phone:          '+233202222001',
    password:       'Driver@2024!',
    vehicle_number: 'GR-4521-22',
    license_number: 'DL-GH-20190045',
    approval_status:'approved',
  },
  {
    first_name:     'Fiifi',
    last_name:      'Aidoo',
    email:          'fiifi.aidoo@smarttrotro.com',
    phone:          '+233202222002',
    password:       'Driver@2024!',
    vehicle_number: 'AS-8834-19',
    license_number: 'DL-GH-20170088',
    approval_status:'approved',
  },
];

const ROUTES = [
  { route_name: 'Circle – Madina Express',   start_location: 'Kwame Nkrumah Circle', end_location: 'Madina Market',    base_fare: 3.50, per_km_rate: 0.30 },
  { route_name: 'Kaneshie – Tema Station',   start_location: 'Kaneshie Market',      end_location: 'Tema Station',     base_fare: 5.00, per_km_rate: 0.35 },
  { route_name: 'Accra Central – Legon',     start_location: 'Accra Central',        end_location: 'University of Ghana, Legon', base_fare: 4.00, per_km_rate: 0.32 },
  { route_name: 'Achimota – Adenta',         start_location: 'Achimota Station',     end_location: 'Adenta',           base_fare: 3.00, per_km_rate: 0.28 },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
async function q(text, params = []) {
  const res = await pool.query(text, params);
  return res;
}

function hash(password) {
  return bcrypt.hash(password, ROUNDS);
}

function log(msg) {
  console.log(`  ✓ ${msg}`);
}

/* ─────────────────────────────────────────────────────────────────────────────
   SEED FUNCTIONS
───────────────────────────────────────────────────────────────────────────── */

async function seedAdmin() {
  console.log('\n── Seeding admin ──────────────────────────────────────────');
  const ph = await hash(ADMIN.password);

  const existing = await q(`SELECT id FROM users WHERE email = $1`, [ADMIN.email]);
  if (existing.rows.length) {
    log(`Admin already exists — skipping (${ADMIN.email})`);
    return existing.rows[0].id;
  }

  const user = await q(
    `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, status)
     VALUES ($1,$2,$3,$4,$5,'admin','active') RETURNING id`,
    [ADMIN.first_name, ADMIN.last_name, ADMIN.email, ADMIN.phone, ph]
  );
  const userId = user.rows[0].id;

  await q(
    `INSERT INTO admin_profiles (user_id, organisation, department, access_code, approval_status)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, ADMIN.organisation, ADMIN.department, ADMIN.access_code, ADMIN.approval_status]
  );

  log(`Admin created: ${ADMIN.first_name} ${ADMIN.last_name} <${ADMIN.email}>`);
  return userId;
}

async function seedPassengers() {
  console.log('\n── Seeding passengers ─────────────────────────────────────');
  const ids = [];

  for (const p of PASSENGERS) {
    const existing = await q(`SELECT id FROM users WHERE email = $1`, [p.email]);
    if (existing.rows.length) {
      log(`Passenger already exists — skipping (${p.email})`);
      ids.push(existing.rows[0].id);
      continue;
    }

    const ph = await hash(p.password);
    const res = await q(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5,'passenger','active') RETURNING id`,
      [p.first_name, p.last_name, p.email, p.phone, ph]
    );
    ids.push(res.rows[0].id);
    log(`Passenger created: ${p.first_name} ${p.last_name} <${p.email}>`);
  }

  return ids;
}

async function seedRoutes(adminId) {
  console.log('\n── Seeding routes ─────────────────────────────────────────');
  const ids = [];

  for (const r of ROUTES) {
    const existing = await q(`SELECT id FROM routes WHERE route_name = $1`, [r.route_name]);
    if (existing.rows.length) {
      log(`Route already exists — skipping (${r.route_name})`);
      ids.push(existing.rows[0].id);
      continue;
    }

    const route = await q(
      `INSERT INTO routes (route_name, start_location, end_location, status, created_by)
       VALUES ($1,$2,$3,'active',$4) RETURNING id`,
      [r.route_name, r.start_location, r.end_location, adminId]
    );
    const routeId = route.rows[0].id;

    await q(
      `INSERT INTO fare_rules (route_id, base_fare, per_km_rate)
       VALUES ($1,$2,$3)
       ON CONFLICT (route_id) DO UPDATE SET base_fare=$2, per_km_rate=$3`,
      [routeId, r.base_fare, r.per_km_rate]
    );

    ids.push(routeId);
    log(`Route created: ${r.route_name} — GH₵${r.base_fare} base + GH₵${r.per_km_rate}/km`);
  }

  return ids;
}

async function seedDrivers(routeIds) {
  console.log('\n── Seeding drivers ────────────────────────────────────────');
  const ids = [];

  for (let i = 0; i < DRIVERS.length; i++) {
    const d = DRIVERS[i];

    const existing = await q(`SELECT id FROM users WHERE email = $1`, [d.email]);
    if (existing.rows.length) {
      log(`Driver already exists — skipping (${d.email})`);
      ids.push(existing.rows[0].id);
      continue;
    }

    const ph = await hash(d.password);
    const user = await q(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5,'driver','active') RETURNING id`,
      [d.first_name, d.last_name, d.email, d.phone, ph]
    );
    const userId = user.rows[0].id;

    // Assign each driver to a different route
    const assignedRouteId = routeIds[i % routeIds.length];

    await q(
      `INSERT INTO driver_profiles
         (user_id, vehicle_number, primary_route_id, license_number, approval_status, is_online)
       VALUES ($1,$2,$3,$4,$5,false)`,
      [userId, d.vehicle_number, assignedRouteId, d.license_number, d.approval_status]
    );

    ids.push(userId);
    log(`Driver created: ${d.first_name} ${d.last_name} — Vehicle: ${d.vehicle_number}`);
  }

  return ids;
}

async function seedTrips(driverIds, routeIds) {
  console.log('\n── Seeding trips ──────────────────────────────────────────');
  const ids = [];

  for (let i = 0; i < driverIds.length; i++) {
    const trip = await q(
      `INSERT INTO trips (driver_id, route_id, start_time, end_time, passenger_count, status)
       VALUES ($1,$2,NOW() - INTERVAL '2 hours',NOW() - INTERVAL '30 minutes',$3,'completed')
       RETURNING id`,
      [driverIds[i], routeIds[i % routeIds.length], Math.floor(Math.random() * 8) + 4]
    );
    ids.push(trip.rows[0].id);
    log(`Trip created for driver ${i + 1}`);
  }

  return ids;
}

async function seedParcels(passengerIds, driverIds, tripIds) {
  console.log('\n── Seeding parcels ────────────────────────────────────────');

  const parcelData = [
    {
      sender:   passengerIds[0], driver: driverIds[0],  trip: tripIds[0],
      pickup:   'Kaneshie Market',       drop: 'Madina Market',
      desc:     'Small envelope with documents', contact: '+233241000001',
      fee: 8.00, status: 'delivered',
    },
    {
      sender:   passengerIds[1], driver: driverIds[1],  trip: tripIds[1],
      pickup:   'Accra Central Post Office', drop: 'Tema Station',
      desc:     'Box of clothing items (medium)', contact: '+233241000002',
      fee: 15.00, status: 'picked_up',
    },
    {
      sender:   passengerIds[2], driver: null, trip: null,
      pickup:   'Achimota Station',      drop: 'Adenta Market',
      desc:     'Phone accessories in padded bag', contact: '+233241000003',
      fee: 10.00, status: 'accepted',
    },
    {
      sender:   passengerIds[3], driver: null, trip: null,
      pickup:   'Legon Campus Gate',     drop: 'Kwame Nkrumah Circle',
      desc:     'Laptop bag with documents', contact: '+233241000004',
      fee: 12.00, status: 'pending',
    },
    {
      sender:   passengerIds[4], driver: null, trip: null,
      pickup:   'Osu Oxford Street',     drop: 'Tesano',
      desc:     'Grocery bag — perishables, handle with care', contact: '+233241000005',
      fee: 6.00, status: 'pending',
    },
  ];

  const ids = [];
  for (const p of parcelData) {
    const res = await q(
      `INSERT INTO parcels
         (sender_id, driver_id, trip_id, pickup_location, drop_location,
          description, receiver_contact, delivery_fee, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [p.sender, p.driver, p.trip, p.pickup, p.drop, p.desc, p.contact, p.fee, p.status]
    );
    ids.push(res.rows[0].id);
    log(`Parcel created: ${p.pickup} → ${p.drop} [${p.status}]`);
  }

  return ids;
}

async function seedTransactions(passengerIds, driverIds, tripIds, parcelIds) {
  console.log('\n── Seeding transactions ───────────────────────────────────');

  const txns = [
    // Fare payments from passengers
    { user: passengerIds[0], trip: tripIds[0],  parcel: null,        amount: 3.50,  method: 'mtn_momo',       type: 'fare',             status: 'completed' },
    { user: passengerIds[1], trip: tripIds[1],  parcel: null,        amount: 5.00,  method: 'vodafone_cash',  type: 'fare',             status: 'completed' },
    { user: passengerIds[2], trip: null,        parcel: null,        amount: 4.00,  method: 'airteltigo',     type: 'fare',             status: 'completed' },
    // Parcel delivery payments
    { user: passengerIds[0], trip: null,        parcel: parcelIds[0], amount: 8.00, method: 'mtn_momo',       type: 'parcel_delivery',  status: 'completed' },
    { user: passengerIds[1], trip: null,        parcel: parcelIds[1], amount: 15.00,method: 'cash',           type: 'parcel_delivery',  status: 'completed' },
    // Driver earnings (completed deliveries credited to driver)
    { user: driverIds[0],    trip: tripIds[0],  parcel: parcelIds[0], amount: 8.00, method: 'mtn_momo',       type: 'parcel_delivery',  status: 'completed' },
    { user: driverIds[1],    trip: tripIds[1],  parcel: parcelIds[1], amount: 15.00,method: 'cash',           type: 'parcel_delivery',  status: 'completed' },
    // A pending/failed transaction
    { user: passengerIds[3], trip: null,        parcel: parcelIds[3], amount: 12.00,method: 'mtn_momo',       type: 'parcel_delivery',  status: 'pending' },
  ];

  for (const t of txns) {
    await q(
      `INSERT INTO transactions (user_id, trip_id, parcel_id, amount, payment_method, type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [t.user, t.trip, t.parcel, t.amount, t.method, t.type, t.status]
    );
    log(`Transaction: GH₵${t.amount} via ${t.method} [${t.status}] — ${t.type}`);
  }
}

async function seedVehicleLocations(driverIds, tripIds) {
  console.log('\n── Seeding vehicle locations ───────────────────────────────');

  const locations = [
    { driver: driverIds[0], trip: tripIds[0], lat: 5.6037,  lng: -0.1870 }, // Accra Central
    { driver: driverIds[1], trip: tripIds[1], lat: 5.6698,  lng: -0.0166 }, // Tema
  ];

  for (const loc of locations) {
    await q(
      `INSERT INTO vehicle_locations (driver_id, trip_id, latitude, longitude)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (driver_id) DO UPDATE SET
         trip_id   = EXCLUDED.trip_id,
         latitude  = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         updated_at = NOW()`,
      [loc.driver, loc.trip, loc.lat, loc.lng]
    );
    log(`Location set for driver: ${loc.lat}, ${loc.lng}`);
  }
}

async function seedSystemLogs(adminId, passengerIds, driverIds) {
  console.log('\n── Seeding system logs ────────────────────────────────────');

  const logs = [
    { userId: adminId,         level: 'success', action: 'Admin account created and approved' },
    { userId: adminId,         level: 'success', action: 'Route created: Circle – Madina Express' },
    { userId: adminId,         level: 'success', action: 'Route created: Kaneshie – Tema Station' },
    { userId: driverIds[0],    level: 'success', action: 'Driver registered: Kojo Appiah' },
    { userId: driverIds[1],    level: 'success', action: 'Driver registered: Fiifi Aidoo' },
    { userId: driverIds[0],    level: 'info',    action: 'Driver started trip on route: Circle – Madina Express' },
    { userId: driverIds[1],    level: 'info',    action: 'Driver started trip on route: Kaneshie – Tema Station' },
    { userId: driverIds[0],    level: 'info',    action: 'Parcel picked up: Kaneshie Market → Madina Market' },
    { userId: driverIds[1],    level: 'info',    action: 'Parcel picked up: Accra Central → Tema Station' },
    { userId: driverIds[0],    level: 'success', action: 'Parcel delivered: Kaneshie Market → Madina Market' },
    { userId: passengerIds[0], level: 'info',    action: 'Passenger registered: Abena Owusu' },
    { userId: passengerIds[1], level: 'info',    action: 'Passenger registered: Kwame Asante' },
    { userId: passengerIds[0], level: 'info',    action: 'Parcel request submitted: Kaneshie Market → Madina Market' },
    { userId: passengerIds[1], level: 'info',    action: 'Fare estimate requested: Accra Central → Tema' },
    { userId: adminId,         level: 'info',    action: `GET /api/admin/stats — 200`, },
  ];

  for (const entry of logs) {
    await q(
      `INSERT INTO system_logs (user_id, level, action) VALUES ($1,$2,$3)`,
      [entry.userId, entry.level, entry.action]
    );
  }

  log(`${logs.length} log entries created`);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN
───────────────────────────────────────────────────────────────────────────── */
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     Smart Trotro — Database Seed Script     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Database : ${process.env.DB_NAME || 'smart_trotro'}`);
  console.log(`  Host     : ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

  try {
    const adminId      = await seedAdmin();
    const passengerIds = await seedPassengers();
    const routeIds     = await seedRoutes(adminId);
    const driverIds    = await seedDrivers(routeIds);
    const tripIds      = await seedTrips(driverIds, routeIds);
    const parcelIds    = await seedParcels(passengerIds, driverIds, tripIds);

    await seedTransactions(passengerIds, driverIds, tripIds, parcelIds);
    await seedVehicleLocations(driverIds, tripIds);
    await seedSystemLogs(adminId, passengerIds, driverIds);

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║          Seed completed successfully!        ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('\n  Login credentials:');
    console.log('  ┌─────────────────────────────────────────────────────────────┐');
    console.log('  │ Role      │ Email                          │ Password        │');
    console.log('  ├─────────────────────────────────────────────────────────────┤');
    console.log('  │ admin     │ admin@smarttrotro.com          │ Admin@2024!     │');
    console.log('  │ driver 1  │ kojo.appiah@smarttrotro.com    │ Driver@2024!    │');
    console.log('  │ driver 2  │ fiifi.aidoo@smarttrotro.com    │ Driver@2024!    │');
    console.log('  │ passenger │ abena.owusu@gmail.com          │ Pass@1234       │');
    console.log('  │ passenger │ kwame.asante@gmail.com         │ Pass@1234       │');
    console.log('  │ passenger │ akosua.boateng@yahoo.com       │ Pass@1234       │');
    console.log('  │ passenger │ yaw.darko@outlook.com          │ Pass@1234       │');
    console.log('  │ passenger │ ama.adjei@gmail.com            │ Pass@1234       │');
    console.log('  └─────────────────────────────────────────────────────────────┘\n');

  } catch (err) {
    console.error('\n  ✗ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();