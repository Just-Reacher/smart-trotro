'use strict';

const router     = require('express').Router();
const controller = require('./drivers.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');

// Driver's own stats for their dashboard
router.get('/stats',   authenticate, requireRole('driver'), controller.getDriverStats);

// Admin view of all online drivers
router.get('/online',  authenticate, requireRole('admin'),  controller.getOnlineDrivers);

module.exports = router;
