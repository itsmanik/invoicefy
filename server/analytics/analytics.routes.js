const express = require('express');
const { getDashboard } = require('./analytics.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/dashboard', requireAuth, getDashboard);

module.exports = router;
