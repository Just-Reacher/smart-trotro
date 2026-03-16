'use strict';

const router     = require('express').Router();
const controller = require('./admin.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');

const adminOnly = [authenticate, requireRole('admin')];

router.get('/stats',                      ...adminOnly, controller.getStats);
router.get('/drivers',                    ...adminOnly, controller.getDrivers);
router.patch('/drivers/:id/approve',      ...adminOnly, controller.approveDriver);
router.patch('/drivers/:id/suspend',      ...adminOnly, controller.suspendDriver);
router.delete('/drivers/:id',             ...adminOnly, controller.removeDriver);
router.get('/passengers',                 ...adminOnly, controller.getPassengers);
router.patch('/passengers/:id/suspend',   ...adminOnly, controller.suspendPassenger);
router.delete('/passengers/:id',          ...adminOnly, controller.removePassenger);
router.get('/payments',                   ...adminOnly, controller.getPayments);

module.exports = router;
