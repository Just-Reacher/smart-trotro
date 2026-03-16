# Smart Trotro — Backend API

Node.js + Express + PostgreSQL backend for the Smart Trotro Mobility and Parcel Delivery Platform.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret
```

### 3. Create the database
```bash
createdb smart_trotro
# or in psql:
# CREATE DATABASE smart_trotro;
```

### 4. Run the schema
```bash
psql -U postgres -d smart_trotro -f src/db/schema.sql
```

### 5. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:5000`

---

## Project Structure

```
smart-trotro-backend/
├── server.js                  Entry point
├── src/
│   ├── app.js                 Express app, middleware, route mounting
│   ├── config/
│   │   ├── db.js              PostgreSQL pool + query helper
│   │   └── env.js             Env variable validation
│   ├── middleware/
│   │   ├── auth.js            JWT Bearer token verification
│   │   ├── role.js            Role-based access control
│   │   ├── validate.js        Joi request body validation
│   │   └── logger.js          System log writer + request logger
│   ├── db/
│   │   └── schema.sql         All 10 tables + indexes + triggers
│   └── modules/
│       ├── auth/              Register, Login, Logout, Get Me
│       ├── users/             Profile, Change Password
│       ├── drivers/           Driver stats, Online drivers
│       ├── admin/             Stats, Manage drivers/passengers/payments
│       ├── routes/            CRUD routes + fare rules
│       ├── trips/             Start/Stop trip, History
│       ├── parcels/           Full parcel lifecycle
│       ├── payments/          Transactions
│       ├── tracking/          Live GPS location
│       ├── earnings/          Driver earnings summary
│       ├── fare/              Fare estimation
│       └── logs/              System logs (admin)
└── public/                    Frontend HTML files (served statically)
```

---

## API Reference

All endpoints are prefixed with `/api`.  
Protected routes require: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint              | Access  | Description           |
|--------|-----------------------|---------|-----------------------|
| POST   | /auth/register        | Public  | Register new user     |
| POST   | /auth/login           | Public  | Login, returns JWT    |
| POST   | /auth/logout          | Any     | Logout (client clears token) |
| GET    | /auth/me              | Any     | Get current user info |

**Register body:**
```json
{
  "firstName": "Kwame",
  "lastName": "Asante",
  "email": "kwame@example.com",
  "phone": "+233201234567",
  "password": "securepassword",
  "role": "passenger",

  // Driver only:
  "vehicleNumber": "GR-1234-20",
  "primaryRouteId": "uuid-of-route",

  // Admin only:
  "organisation": "TrotroGo Ops",
  "department": "Operations",
  "accessCode": "ADMIN2024"
}
```

**Login body:**
```json
{ "email": "kwame@example.com", "password": "securepassword" }
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "role": "passenger", "email": "..." }
  }
}
```

---

### Users (any authenticated)
| Method | Endpoint               | Description            |
|--------|------------------------|------------------------|
| GET    | /users/profile         | Get own profile        |
| PATCH  | /users/profile         | Update name/phone      |
| PATCH  | /users/password        | Change password        |
| PATCH  | /users/driver-profile  | Update vehicle/route   |

---

### Admin (admin role required)
| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /admin/stats                    | Dashboard stat counts    |
| GET    | /admin/drivers                  | All drivers (searchable) |
| PATCH  | /admin/drivers/:id/approve      | Approve driver           |
| PATCH  | /admin/drivers/:id/suspend      | Suspend driver           |
| DELETE | /admin/drivers/:id              | Remove driver            |
| GET    | /admin/passengers               | All passengers           |
| PATCH  | /admin/passengers/:id/suspend   | Suspend passenger        |
| DELETE | /admin/passengers/:id           | Remove passenger         |
| GET    | /admin/payments                 | All transactions         |

---

### Routes
| Method | Endpoint       | Access       | Description          |
|--------|----------------|--------------|----------------------|
| GET    | /routes        | Any auth     | List active routes   |
| GET    | /routes/:id    | Any auth     | Single route + fares |
| POST   | /routes        | Admin        | Create route         |
| PATCH  | /routes/:id    | Admin        | Update route         |
| DELETE | /routes/:id    | Admin        | Delete route         |

**Create route body:**
```json
{
  "routeName": "Circle – Madina",
  "startLocation": "Kwame Nkrumah Circle",
  "endLocation": "Madina Market",
  "baseFare": 2.50,
  "perKmRate": 0.30
}
```

---

### Trips (driver role)
| Method | Endpoint        | Description               |
|--------|-----------------|---------------------------|
| POST   | /trips/start    | Start a trip session      |
| POST   | /trips/stop     | Stop active trip          |
| GET    | /trips/active   | Get driver's active trip  |
| GET    | /trips/history  | Driver's trip history     |
| GET    | /trips/all      | All trips (admin only)    |

**Start trip body:** `{ "routeId": "uuid" }`

---

### Parcels
| Method | Endpoint                  | Access     | Description               |
|--------|---------------------------|------------|---------------------------|
| POST   | /parcels                  | Passenger  | Create parcel request     |
| GET    | /parcels/my-deliveries    | Passenger  | Own parcels               |
| GET    | /parcels/requests         | Driver     | Available requests        |
| GET    | /parcels/mine             | Driver     | Assigned parcels          |
| PATCH  | /parcels/:id/accept       | Driver     | Accept request            |
| PATCH  | /parcels/:id/decline      | Driver     | Decline request           |
| PATCH  | /parcels/:id/pickup       | Driver     | Mark picked up            |
| PATCH  | /parcels/:id/deliver      | Driver     | Mark delivered            |
| GET    | /parcels/status/:id       | Any auth   | Track parcel by ID        |
| GET    | /parcels/all              | Admin      | All parcels               |

---

### Tracking
| Method | Endpoint                    | Access    | Description                |
|--------|-----------------------------|-----------|----------------------------|
| PATCH  | /tracking/location          | Driver    | Push GPS coordinates       |
| GET    | /tracking/route/:routeId    | Any auth  | Live vehicles on route     |
| GET    | /tracking/driver/:driverId  | Any auth  | Single driver location     |

**Update location body:**
```json
{ "latitude": 5.6037, "longitude": -0.1870, "tripId": "uuid" }
```

---

### Earnings (driver)
| Method | Endpoint   | Description                      |
|--------|------------|----------------------------------|
| GET    | /earnings  | Summary (today/week/month) + breakdown |

---

### Fare
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | /fare/estimate        | Estimate fare for a trip |
| PUT    | /fare/rules/:routeId  | Set fare rules (admin)   |

**Estimate body:** `{ "pickup": "Circle", "destination": "Madina" }`

---

### Payments
| Method | Endpoint         | Access   | Description              |
|--------|------------------|----------|--------------------------|
| GET    | /payments/mine   | Any auth | Own transactions         |
| GET    | /payments/summary| Any auth | Transaction totals       |
| POST   | /payments        | Any auth | Record a transaction     |
| GET    | /payments/all    | Admin    | All transactions         |

---

### Drivers
| Method | Endpoint        | Access  | Description            |
|--------|-----------------|---------|------------------------|
| GET    | /drivers/stats  | Driver  | Driver dashboard stats |
| GET    | /drivers/online | Admin   | All online drivers     |

---

### Logs (admin)
| Method | Endpoint     | Description              |
|--------|--------------|--------------------------|
| GET    | /logs        | All system logs          |
| GET    | /logs/stats  | Log counts by level      |

---

## Response Format

All responses follow this structure:

```json
// Success
{ "success": true, "message": "Optional message", "data": { ... } }

// Error
{ "success": false, "message": "Error description" }
```

---

## Database Tables

| # | Table               | Purpose                        |
|---|---------------------|--------------------------------|
| 1 | users               | All users (base table)         |
| 2 | driver_profiles     | Driver vehicle/route info      |
| 3 | admin_profiles      | Admin organisation info        |
| 4 | routes              | Trotro routes                  |
| 5 | trips               | Active/completed trip sessions |
| 6 | vehicle_locations   | Live GPS data per driver       |
| 7 | parcels             | Parcel delivery lifecycle      |
| 8 | transactions        | Payment records                |
| 9 | fare_rules          | Base fare + per-km rates       |
|10 | system_logs         | Audit trail of all actions     |

---

## Role Summary

| Role      | Can Do                                                         |
|-----------|----------------------------------------------------------------|
| passenger | Register, send parcels, track parcels, pay fares, fare estimate|
| driver    | Start/stop routes, accept/deliver parcels, view earnings       |
| admin     | Manage all users, routes, payments, view logs                  |
