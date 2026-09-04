const express = require('express');
const { sendOtp, verifyOtp, me } = require('../controllers/citizenAuthController');
const { protectCitizen } = require('../middleware/auth');

const router = express.Router();
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', protectCitizen, me);
module.exports = router;
