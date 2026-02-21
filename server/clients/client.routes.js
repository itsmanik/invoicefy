const express = require('express');
const router = express.Router();
const { createClient, getAllClients } = require('./client.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const Client = require('./client.model');

// POST /api/clients/create
router.post('/create', requireAuth, createClient);

// GET /api/clients/all
router.get('/all', requireAuth, getAllClients);

// GET /api/clients/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const client = await Client.findOne({ where: { id: req.params.id, businessId: req.user.businessId } });
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
        return res.status(200).json({ success: true, client });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/clients/:id
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const client = await Client.findOne({ where: { id: req.params.id, businessId: req.user.businessId } });
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
        await client.update(req.body);
        return res.status(200).json({ success: true, client });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/clients/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const client = await Client.findOne({ where: { id: req.params.id, businessId: req.user.businessId } });
        if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
        await client.destroy();
        return res.status(200).json({ success: true, message: 'Client deleted' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
