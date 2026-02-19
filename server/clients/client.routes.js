const express = require('express');
const router = express.Router();
const { createClient, getAllClients } = require('./client.controller');

router.post('/create', createClient);
router.get('/all', getAllClients);

module.exports = router;