const express = require('express');
const router = express.Router();
const { createClient, getAllClients } = require('./client.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/create', requireAuth, createClient);
router.get('/all', requireAuth, getAllClients);

module.exports = router;
