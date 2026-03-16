'use strict';

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');
const { requestLogger } = require('./middleware/logger');

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logging ───────────────────────────────────────────────────────────
app.use(requestLogger);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, '../public')));

// Home / Index
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/index.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Register
app.get('/register', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});
app.get('/register.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// Login
app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});
app.get('/login.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Passenger Dashboard
app.get('/passenger-dashboard.html', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public/passenger-dashboard.html'));
});

// Or optional friendly route without ".html"
app.get('/passenger-dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public/passenger-dashboard.html'));
});


// Driver Dashboard
app.get('/driver-dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver-dashboard.html'));
});
app.get('/driver-dashboard.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/driver-dashboard.html'));
});

// Admin Dashboard
app.get('/admin-dashboard', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
});
app.get('/admin-dashboard.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-dashboard.html'));
});

// About
app.get('/about', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/about.html'));
});
app.get('/about.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/about.html'));
});

// Contact
app.get('/contact', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact.html'));
});
app.get('/contact.html', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/contact.html'));
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./modules/auth/auth.routes'));
app.use('/api/admin',    require('./modules/admin/admin.routes'));
app.use('/api/users',    require('./modules/users/users.routes'));
app.use('/api/drivers',  require('./modules/drivers/drivers.routes'));
app.use('/api/routes',   require('./modules/routes/routes.routes'));
app.use('/api/trips',    require('./modules/trips/trips.routes'));
app.use('/api/parcels',  require('./modules/parcels/parcels.routes'));
app.use('/api/payments', require('./modules/payments/payments.routes'));
app.use('/api/tracking', require('./modules/tracking/tracking.routes'));
app.use('/api/earnings', require('./modules/earnings/earnings.routes'));
app.use('/api/fare',     require('./modules/fare/fare.routes'));
app.use('/api/logs',     require('./modules/logs/logs.routes'));

app.use((req, res) => {
  res.status(404).send("Page not found");
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Global error:', err);
  const status  = err.status  || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ success: false, message });
});

module.exports = app;
