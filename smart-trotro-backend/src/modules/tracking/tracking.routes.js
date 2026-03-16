'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./tracking.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');
const { validate }     = require('../../middleware/validate');

const locationSchema = Joi.object({
  latitude:  Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  tripId:    Joi.string().uuid().optional().allow(null, ''),
});

// Driver pushes their location
router.patch('/location',
  authenticate,
  requireRole('driver'),
  validate(locationSchema),
  controller.updateLocation
);

// Passenger queries live vehicles on a route
router.get('/route/:routeId',   authenticate, controller.getVehiclesOnRoute);

// Get specific driver's location
router.get('/driver/:driverId', authenticate, controller.getDriverLocation);

module.exports = router;
