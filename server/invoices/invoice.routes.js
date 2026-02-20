const express = require('express');
const router = express.Router();
const { createInvoice, getInvoice, updateStatus, downloadInvoice } = require('./invoice.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/create', requireAuth, createInvoice);
router.get('/download', requireAuth, downloadInvoice);
router.get('/:id', requireAuth, getInvoice);
router.put('/status', requireAuth, updateStatus);

module.exports = router;
