'use strict';

const service = require('./payments.service');

async function getMyTransactions(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await service.getUserTransactions(req.user.id, {
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function getSummary(req, res, next) {
  try {
    const data = await service.getTransactionSummary(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

async function createTransaction(req, res, next) {
  try {
    const data = await service.createTransaction({ userId: req.user.id, ...req.body });
    res.status(201).json({ success: true, message: 'Transaction recorded', data });
  } catch (err) { next(err); }
}

async function getAllTransactions(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await service.getAllTransactions({
      limit:  parseInt(limit  || '50', 10),
      offset: parseInt(offset || '0',  10),
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

module.exports = { getMyTransactions, getSummary, createTransaction, getAllTransactions };
