'use strict';

const service = require('./auth.service');

async function register(req, res, next) {
  try {
    const user = await service.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await service.login(req.body);
    res.json({
      success: true,
      message: 'Login successful',
      data: { user, token },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await service.getMe(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  // JWT is stateless — client simply deletes the token.
  // For token blacklisting, add a redis/db check here later.
  res.json({ success: true, message: 'Logged out successfully' });
}

module.exports = { register, login, getMe, logout };
