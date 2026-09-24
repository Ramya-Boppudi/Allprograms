const express = require('express');
const ctrl = require('../controllers/grievanceController');
const paymentCtrl = require('../controllers/paymentController');
const { protectStaff, protectCitizen, optionalCitizen, authorize } = require('../middleware/auth');
const { attachmentsUpload } = require('../middleware/upload');
const { REGISTER_ROLES } = require('../constants/roles');

const router = express.Router();

router.get('/track', optionalCitizen, ctrl.getByReference);
router.get('/track/*', optionalCitizen, ctrl.getByReference);
router.post('/public', protectCitizen, attachmentsUpload, ctrl.create);
router.get('/public/mine', protectCitizen, ctrl.myPublic);

router.get('/', protectStaff, ctrl.list);
router.get('/dashboard', protectStaff, ctrl.dashboard);
router.post('/register/send-otp', protectStaff, authorize(...REGISTER_ROLES), ctrl.sendRegisterOtp);
router.post('/register/verify-otp', protectStaff, authorize(...REGISTER_ROLES), ctrl.verifyRegisterOtp);
router.post('/', protectStaff, authorize(...REGISTER_ROLES), attachmentsUpload, ctrl.create);
router.get('/:id(\\d+)/payment', protectStaff, paymentCtrl.getOrCreate);
router.post('/:id(\\d+)/payment/confirm', protectStaff, paymentCtrl.confirmForGrievance);
router.get('/:id(\\d+)', protectStaff, ctrl.getById);
router.post('/:id(\\d+)/attachments', protectStaff, attachmentsUpload, ctrl.addAttachments);
router.post('/:id(\\d+)/forward-to-pro', protectStaff, ctrl.forwardToPro);
router.post('/:id(\\d+)/assign-division', protectStaff, ctrl.assignToDivision);
router.post('/:id(\\d+)/submit-action', protectStaff, ctrl.submitAction);
router.post('/:id(\\d+)/revert', protectStaff, ctrl.revertToDivision);
router.post('/:id(\\d+)/complete', protectStaff, ctrl.complete);

module.exports = router;
