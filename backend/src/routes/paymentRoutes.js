const express = require('express');
const ctrl = require('../controllers/paymentController');

const router = express.Router();

router.get('/:orderRef', ctrl.getPublic);
router.post('/:orderRef/demo-confirm', ctrl.demoConfirm);
router.post('/webhook', ctrl.webhook);

module.exports = router;
