const express = require('express');
const { districts, grievanceTypes, divisions, branding, logoImage } = require('../controllers/masterController');

const router = express.Router();
router.get('/districts', districts);
router.get('/grievance-types', grievanceTypes);
router.get('/divisions', divisions);
router.get('/branding', branding);
router.get('/logos/:code', logoImage);
module.exports = router;
