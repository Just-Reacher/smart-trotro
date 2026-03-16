'use strict';

const service = require('./trips.service');

async function startTrip(req, res, next) {
  try {
    const data = await service.startTrip(req.user.id, req.body.routeId);
    res.status(201).json({ success: true, message: 'Trip started', data });
  } catch (err) { next(err); }
}

async function stopTrip(req, res, next) {
  try {
    const data = await service.stopTrip(req.user.id);
    res.json({ success: true, message: 'Trip stopped', data });
  } catch (err) { next(err); }
}

async function getDriverHistory(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await service.getDriverHistory(req.user.id, {
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getActiveTrip(req, res, next) {
  try {
    const data = await service.getActiveTrip(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getAllTrips(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await service.getAllTrips({
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { startTrip, stopTrip, getDriverHistory, getActiveTrip, getAllTrips };
