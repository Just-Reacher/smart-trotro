'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./trips.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');
const { validate }     = require('../../middleware/validate');

const startSchema = Joi.object({
  routeId: Joi.string().uuid().required(),
});

router.post('/start',   authenticate, requireRole('driver'), validate(startSchema), controller.startTrip);
router.post('/stop',    authenticate, requireRole('driver'), controller.stopTrip);
router.get('/active',   authenticate, requireRole('driver'), controller.getActiveTrip);
router.get('/history',  authenticate, requireRole('driver'), controller.getDriverHistory);
router.get('/all',      authenticate, requireRole('admin'),  controller.getAllTrips);

module.exports = router;
