'use strict';

const service = require('./logs.service');

async function getLogs(req, res, next) {
  try {
    const { level, limit, offset } = req.query;
    const data = await service.getLogs({
      level,
      limit:  parseInt(limit  || '100', 10),
      offset: parseInt(offset || '0',   10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getLogStats(req, res, next) {
  try {
    const data = await service.getLogStats();
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { getLogs, getLogStats };
