const express = require('express');
const { login, me } = require('../controllers/staffAuthController');
const { protectStaff } = require('../middleware/auth');

const router = express.Router();
router.post('/login', login);
router.get('/me', protectStaff, me);
module.exports = router;
