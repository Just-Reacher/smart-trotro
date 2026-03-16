'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./parcels.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');
const { validate }     = require('../../middleware/validate');

const createSchema = Joi.object({
  pickupLocation:  Joi.string().min(3).max(255).required(),
  dropLocation:    Joi.string().min(3).max(255).required(),
  description:     Joi.string().max(1000).optional().allow('', null),
  receiverContact: Joi.string().min(10).max(20).required(),
  deliveryFee:     Joi.number().min(0).optional().default(0),
});

// Passenger
router.post('/',             authenticate, requireRole('passenger'), validate(createSchema), controller.createParcel);
router.get('/my-deliveries', authenticate, requireRole('passenger'), controller.getSenderParcels);

// Driver
router.get('/requests',  authenticate, requireRole('driver'), controller.getAvailableRequests);
router.get('/mine',      authenticate, requireRole('driver'), controller.getDriverParcels);
router.patch('/:id/accept',  authenticate, requireRole('driver'), controller.acceptParcel);
router.patch('/:id/decline', authenticate, requireRole('driver'), controller.declineParcel);
router.patch('/:id/pickup',  authenticate, requireRole('driver'), controller.markPickedUp);
router.patch('/:id/deliver', authenticate, requireRole('driver'), controller.markDelivered);

// Admin
router.get('/all', authenticate, requireRole('admin'), controller.getAllParcels);

// Any authenticated user — track by parcel ID
router.get('/status/:id', authenticate, controller.trackParcel);

module.exports = router;
