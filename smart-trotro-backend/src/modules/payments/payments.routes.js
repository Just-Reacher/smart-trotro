'use strict';

const router     = require('express').Router();
const Joi        = require('joi');
const controller = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');
const { validate }     = require('../../middleware/validate');

const txnSchema = Joi.object({
  tripId:        Joi.string().uuid().optional().allow(null, ''),
  parcelId:      Joi.string().uuid().optional().allow(null, ''),
  amount:        Joi.number().min(0.01).required(),
  paymentMethod: Joi.string().valid('mtn_momo','vodafone_cash','airteltigo','cash').required(),
  type:          Joi.string().valid('fare','parcel_delivery','refund').optional().default('fare'),
  reference:     Joi.string().max(100).optional().allow(null, ''),
});

router.get('/mine',    authenticate, controller.getMyTransactions);
router.get('/summary', authenticate, controller.getSummary);
router.post('/',       authenticate, validate(txnSchema), controller.createTransaction);
router.get('/all',     authenticate, requireRole('admin'), controller.getAllTransactions);

module.exports = router;
