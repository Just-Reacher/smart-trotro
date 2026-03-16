'use strict';

const db = require('../../config/db');

// ── Estimate fare between two points ─────────────────────────────────────────
async function estimateFare({ pickup, destination }) {
  // Find a route whose start/end loosely match the input
  const result = await db.query(
    `SELECT r.id, r.route_name, r.start_location, r.end_location,
            fr.base_fare, fr.per_km_rate
     FROM routes r
     LEFT JOIN fare_rules fr ON fr.route_id = r.id
     WHERE r.status = 'active'
       AND (
         r.start_location ILIKE $1 OR r.end_location ILIKE $2
         OR r.start_location ILIKE $2 OR r.end_location ILIKE $1
       )
     LIMIT 5`,
    [`%${pickup}%`, `%${destination}%`]
  );

  if (!result.rows.length) {
    // Return a generic estimate when no route match found
    return {
      matched:          false,
      routeName:        'Generic estimate',
      baseFare:         2.50,
      estimatedFare:    2.50,
      currency:         'GHS',
      note:             'No exact route matched. Fare may vary.',
    };
  }

  const route = result.rows[0];
  const baseFare   = parseFloat(route.base_fare   || 2.50);
  const perKmRate  = parseFloat(route.per_km_rate || 0.50);

  // Approximate distance (for demo — replace with actual geo calculation or Maps API)
  const estimatedKm    = 10; // placeholder
  const estimatedFare  = baseFare + (perKmRate * estimatedKm);

  return {
    matched:        true,
    routeId:        route.id,
    routeName:      route.route_name,
    startLocation:  route.start_location,
    endLocation:    route.end_location,
    baseFare:       baseFare.toFixed(2),
    perKmRate:      perKmRate.toFixed(2),
    estimatedFare:  estimatedFare.toFixed(2),
    currency:       'GHS',
    note:           'Estimated fare. Actual fare may vary by driver.',
  };
}

// ── Admin: set/update fare rules for a route ──────────────────────────────────
async function setFareRule(routeId, { baseFare, perKmRate }) {
  const result = await db.query(
    `INSERT INTO fare_rules (route_id, base_fare, per_km_rate)
     VALUES ($1, $2, $3)
     ON CONFLICT (route_id) DO UPDATE SET
       base_fare   = EXCLUDED.base_fare,
       per_km_rate = EXCLUDED.per_km_rate,
       updated_at  = NOW()
     RETURNING *`,
    [routeId, baseFare, perKmRate]
  );
  return result.rows[0];
}

module.exports = { estimateFare, setFareRule };
