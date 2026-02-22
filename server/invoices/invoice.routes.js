const express = require('express');
const router = express.Router();
const { createInvoice, getInvoice, updateStatus, downloadInvoice } = require('./invoice.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const Invoice = require('./invoice.model');
const Client = require('../clients/client.model');

// POST /api/invoices/create
router.post('/create', requireAuth, createInvoice);

// GET /api/invoices/all
router.get('/all', requireAuth, async (req, res) => {
    try {
        const invoices = await Invoice.findAll({
            where: { businessId: req.user.businessId },
            include: [{ model: Client, attributes: ['id', 'name', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        return res.status(200).json({ success: true, invoices });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/invoices/download/:id
router.get('/download/:id', requireAuth, async (req, res) => {
    // patch req.query.id so the existing controller works
    req.query = { ...req.query, id: req.params.id };
    return downloadInvoice(req, res);
});

// PUT /api/invoices/:id/status
router.put('/:id/status', requireAuth, async (req, res) => {
    const { status } = req.body;
    if (!['Paid', 'Unpaid', 'Overdue'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
    }
    const invoice = await Invoice.findOne({ where: { id: req.params.id, businessId: req.user.businessId } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    invoice.status = status;
    await invoice.save();
    return res.status(200).json({ success: true, invoice });
});

// GET /api/invoices/:id  (must be after /all and /download/:id to avoid conflicts)
router.get('/:id', requireAuth, getInvoice);

module.exports = router;
