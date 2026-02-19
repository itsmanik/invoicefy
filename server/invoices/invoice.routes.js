const express = require('express');
const router = express.Router();
const { createInvoice, getInvoice, updateStatus, downloadInvoice } = require('./invoice.controller');

router.get('/download', downloadInvoice);
router.post('/create', createInvoice);
router.get('/:id', getInvoice);
router.put('/status', updateStatus);

module.exports = router;