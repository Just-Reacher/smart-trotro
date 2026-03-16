'use strict';

const service = require('./earnings.service');

async function getEarnings(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await service.getEarnings(req.user.id, {
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { getEarnings };
