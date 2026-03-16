'use strict';

const service = require('./parcels.service');

async function createParcel(req, res, next) {
  try {
    const data = await service.createParcel({ senderId: req.user.id, ...req.body });
    res.status(201).json({ success: true, message: 'Parcel request submitted', data });
  } catch (err) { next(err); }
}

async function getAvailableRequests(req, res, next) {
  try {
    const data = await service.getAvailableRequests();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getDriverParcels(req, res, next) {
  try {
    const data = await service.getDriverParcels(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getSenderParcels(req, res, next) {
  try {
    const data = await service.getSenderParcels(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function trackParcel(req, res, next) {
  try {
    const data = await service.trackParcel(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function acceptParcel(req, res, next) {
  try {
    const data = await service.acceptParcel(req.params.id, req.user.id);
    res.json({ success: true, message: 'Parcel accepted', data });
  } catch (err) { next(err); }
}

async function declineParcel(req, res, next) {
  try {
    const data = await service.declineParcel(req.params.id, req.user.id);
    res.json({ success: true, message: 'Parcel declined', data });
  } catch (err) { next(err); }
}

async function markPickedUp(req, res, next) {
  try {
    const data = await service.markPickedUp(req.params.id, req.user.id);
    res.json({ success: true, message: 'Parcel marked as picked up', data });
  } catch (err) { next(err); }
}

async function markDelivered(req, res, next) {
  try {
    const data = await service.markDelivered(req.params.id, req.user.id);
    res.json({ success: true, message: 'Parcel marked as delivered', data });
  } catch (err) { next(err); }
}

async function getAllParcels(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const data = await service.getAllParcels({
      status,
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = {
  createParcel, getAvailableRequests, getDriverParcels, getSenderParcels,
  trackParcel, acceptParcel, declineParcel, markPickedUp, markDelivered, getAllParcels,
};
