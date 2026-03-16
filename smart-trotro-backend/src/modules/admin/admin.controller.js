'use strict';

const service = require('./admin.service');

async function getStats(req, res, next) {
  try {
    const data = await service.getStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getDrivers(req, res, next) {
  try {
    const { search, limit, offset } = req.query;
    const data = await service.getDrivers({
      search: search || '',
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function approveDriver(req, res, next) {
  try {
    await service.approveDriver(req.params.id, req.user.id);
    res.json({ success: true, message: 'Driver approved' });
  } catch (err) { next(err); }
}

async function suspendDriver(req, res, next) {
  try {
    await service.suspendDriver(req.params.id, req.user.id);
    res.json({ success: true, message: 'Driver suspended' });
  } catch (err) { next(err); }
}

async function removeDriver(req, res, next) {
  try {
    await service.removeDriver(req.params.id, req.user.id);
    res.json({ success: true, message: 'Driver removed' });
  } catch (err) { next(err); }
}

async function getPassengers(req, res, next) {
  try {
    const { search, limit, offset } = req.query;
    const data = await service.getPassengers({
      search: search || '',
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function suspendPassenger(req, res, next) {
  try {
    await service.suspendPassenger(req.params.id, req.user.id);
    res.json({ success: true, message: 'Passenger suspended' });
  } catch (err) { next(err); }
}

async function removePassenger(req, res, next) {
  try {
    await service.removePassenger(req.params.id, req.user.id);
    res.json({ success: true, message: 'Passenger removed' });
  } catch (err) { next(err); }
}

async function getPayments(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await service.getPayments({
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = {
  getStats, getDrivers, approveDriver, suspendDriver, removeDriver,
  getPassengers, suspendPassenger, removePassenger, getPayments,
};
