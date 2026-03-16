'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./routes.controller');
const { authenticate }  = require('../../middleware/auth');
const { requireRole }   = require('../../middleware/role');
const { validate }      = require('../../middleware/validate');

const routeSchema = Joi.object({
  routeName:     Joi.string().min(2).max(200).required(),
  startLocation: Joi.string().min(2).max(200).required(),
  endLocation:   Joi.string().min(2).max(200).required(),
  baseFare:      Joi.number().min(0).optional(),
  perKmRate:     Joi.number().min(0).optional(),
});

const updateSchema = Joi.object({
  routeName:     Joi.string().min(2).max(200).optional(),
  startLocation: Joi.string().min(2).max(200).optional(),
  endLocation:   Joi.string().min(2).max(200).optional(),
  status:        Joi.string().valid('active', 'inactive').optional(),
  baseFare:      Joi.number().min(0).optional(),
  perKmRate:     Joi.number().min(0).optional(),
});

// Public — passengers/drivers need routes list
router.get('/',    authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);

// Admin only — mutations
router.post('/',    authenticate, requireRole('admin'), validate(routeSchema),  controller.create);
router.patch('/:id', authenticate, requireRole('admin'), validate(updateSchema), controller.update);
router.delete('/:id', authenticate, requireRole('admin'), controller.remove);

module.exports = router;
