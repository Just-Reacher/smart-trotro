'use strict';

const service = require('./users.service');

async function getProfile(req, res, next) {
  try {
    const data = await service.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const data = await service.updateProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Profile updated', data });
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    await service.changePassword(req.user.id, req.body);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
}

async function updateDriverProfile(req, res, next) {
  try {
    const data = await service.updateDriverProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Driver profile updated', data });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, changePassword, updateDriverProfile };
