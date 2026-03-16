'use strict';

const service = require('./drivers.service');

async function getDriverStats(req, res, next) {
  try {
    const data = await service.getDriverStats(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getOnlineDrivers(req, res, next) {
  try {
    const data = await service.getOnlineDrivers();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { getDriverStats, getOnlineDrivers };
