const express = require('express');
const { getBusinessProfile } = require('./business.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// GET /api/businesses/profile
router.get('/profile', requireAuth, getBusinessProfile);

// PUT /api/businesses/profile
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const Business = require('./business.model');
        const business = await Business.findByPk(req.user.businessId);
        if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
        await business.update(req.body);
        return res.status(200).json({ success: true, business });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/businesses/logo
router.post('/logo', requireAuth, upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        const logoUrl = `/uploads/${req.file.filename}`;
        const Business = require('./business.model');
        const business = await Business.findByPk(req.user.businessId);
        if (!business) return res.status(404).json({ success: false, message: 'Business not found' });
        await business.update({ logoUrl });
        return res.status(200).json({ success: true, logoUrl });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
