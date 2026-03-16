'use strict';

const service = require('./routes.service');

async function getAll(req, res, next) {
  try {
    const data = await service.getAll({ status: req.query.status });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await service.getById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await service.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Route created', data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await service.update(req.params.id, req.body, req.user.id);
    res.json({ success: true, message: 'Route updated', data });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id, req.user.id);
    res.json({ success: true, message: 'Route deleted' });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, remove };
