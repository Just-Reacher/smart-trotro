'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./users.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');
const { validate }     = require('../../middleware/validate');

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).optional(),
  lastName:  Joi.string().min(2).max(100).optional(),
  phone:     Joi.string().min(10).max(20).optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).required(),
  newPassword:     Joi.string().min(8).required(),
});

const driverProfileSchema = Joi.object({
  vehicleNumber:   Joi.string().max(50).optional(),
  primaryRouteId:  Joi.string().uuid().optional().allow(null, ''),
  licenseNumber:   Joi.string().max(100).optional().allow(null, ''),
});

router.get('/profile',         authenticate, controller.getProfile);
router.patch('/profile',       authenticate, validate(updateProfileSchema), controller.updateProfile);
router.patch('/password',      authenticate, validate(changePasswordSchema), controller.changePassword);
router.patch('/driver-profile',authenticate, requireRole('driver'), validate(driverProfileSchema), controller.updateDriverProfile);

module.exports = router;
