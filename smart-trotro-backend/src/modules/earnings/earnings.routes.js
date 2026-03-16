'use strict';

const router     = require('express').Router();
const controller = require('./earnings.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');

router.get('/', authenticate, requireRole('driver'), controller.getEarnings);

module.exports = router;
