'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./auth.controller');
const { validate }     = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');

// ── Validation schemas ────────────────────────────────────────────────────────
const registerSchema = Joi.object({
  firstName:      Joi.string().min(2).max(100).required(),
  lastName:       Joi.string().min(2).max(100).required(),
  email:          Joi.string().email().required(),
  phone:          Joi.string().min(10).max(20).required(),
  password:       Joi.string().min(8).required(),
  role:           Joi.string().valid('passenger', 'driver', 'admin').required(),
  // Driver-only
  vehicleNumber:  Joi.when('role', { is: 'driver', then: Joi.string().required(), otherwise: Joi.optional() }),
  primaryRouteId: Joi.string().uuid().optional().allow(null, ''),
  // Admin-only
  organisation:   Joi.when('role', { is: 'admin', then: Joi.string().optional(), otherwise: Joi.optional() }),
  department:     Joi.string().optional().allow(null, ''),
  accessCode:     Joi.string().optional().allow(null, ''),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(1).required(),
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.post('/register', validate(registerSchema), controller.register);
router.post('/login',    validate(loginSchema),    controller.login);
router.post('/logout',   authenticate,             controller.logout);
router.get('/me',        authenticate,             controller.getMe);

module.exports = router;
