'use strict';

const service = require('./fare.service');

async function estimateFare(req, res, next) {
  try {
    const data = await service.estimateFare({
      pickup:      req.body.pickup,
      destination: req.body.destination,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function setFareRule(req, res, next) {
  try {
    const data = await service.setFareRule(req.params.routeId, req.body);
    res.json({ success: true, message: 'Fare rule saved', data });
  } catch (err) { next(err); }
}

module.exports = { estimateFare, setFareRule };
