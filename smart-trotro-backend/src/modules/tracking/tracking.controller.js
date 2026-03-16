'use strict';

const service = require('./tracking.service');

async function updateLocation(req, res, next) {
  try {
    const data = await service.updateLocation(req.user.id, req.body);
    res.json({ success: true, message: 'Location updated', data });
  } catch (err) { next(err); }
}

async function getVehiclesOnRoute(req, res, next) {
  try {
    const data = await service.getVehiclesOnRoute(req.params.routeId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getDriverLocation(req, res, next) {
  try {
    const data = await service.getDriverLocation(req.params.driverId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { updateLocation, getVehiclesOnRoute, getDriverLocation };
