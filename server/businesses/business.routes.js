const express = require('express');
const { getBusinessProfile } = require('./business.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', requireAuth, getBusinessProfile);

module.exports = router;
