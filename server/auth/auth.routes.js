const express = require('express');
const { register, login } = require('./auth.controller');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

router.post('/register', upload.single('logo'), register);
router.post('/login', login);

module.exports = router;
