'use strict';

const router     = require('express').Router();
const controller = require('./logs.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/role');

const adminOnly = [authenticate, requireRole('admin')];

router.get('/',      ...adminOnly, controller.getLogs);
router.get('/stats', ...adminOnly, controller.getLogStats);

module.exports = router;
