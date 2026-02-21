const express = require('express');
const { getDashboard } = require('./analytics.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { Op } = require('sequelize');
const Invoice = require('../invoices/invoice.model');

const router = express.Router();

// GET /api/analytics/dashboard
router.get('/dashboard', requireAuth, getDashboard);

// GET /api/analytics/revenue  — monthly revenue for the last 6 months
router.get('/revenue', requireAuth, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const invoices = await Invoice.findAll({
            where: {
                businessId,
                status: 'Paid',
                createdAt: { [Op.gte]: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) }
            }
        });

        // Group by month
        const monthlyMap = {};
        invoices.forEach(inv => {
            const d = new Date(inv.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[key] = (monthlyMap[key] || 0) + Number(inv.total || 0);
        });

        const revenueData = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, revenue]) => ({ month, revenue: Number(revenue.toFixed(2)) }));

        return res.status(200).json({ success: true, revenueData });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/analytics/invoices  — invoice status breakdown
router.get('/invoices', requireAuth, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const invoices = await Invoice.findAll({ where: { businessId } });

        const statusBreakdown = {
            Paid: 0,
            Unpaid: 0,
            Overdue: 0,
        };
        invoices.forEach(inv => {
            if (statusBreakdown[inv.status] !== undefined) statusBreakdown[inv.status]++;
        });

        return res.status(200).json({
            success: true,
            invoiceStats: Object.entries(statusBreakdown).map(([status, count]) => ({ status, count }))
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
