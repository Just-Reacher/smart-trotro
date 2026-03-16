'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./fare.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');
const { validate }     = require('../../middleware/validate');

const estimateSchema = Joi.object({
  pickup:      Joi.string().min(2).required(),
  destination: Joi.string().min(2).required(),
});

const fareRuleSchema = Joi.object({
  baseFare:   Joi.number().min(0).required(),
  perKmRate:  Joi.number().min(0).required(),
});

router.post('/estimate',
  authenticate,
  validate(estimateSchema),
  controller.estimateFare
);

router.put('/rules/:routeId',
  authenticate,
  requireRole('admin'),
  validate(fareRuleSchema),
  controller.setFareRule
);

module.exports = router;
