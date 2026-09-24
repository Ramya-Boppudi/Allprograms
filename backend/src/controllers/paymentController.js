const pool = require('../config/db');
const {
  paymentMode,
  getOrCreatePayment,
  getPaymentByOrderRef,
  markPaid,
  recordFeeByGrievanceId,
  serializePayment,
} = require('../services/paymentService');

async function loadBasicGrievance(id) {
  const [rows] = await pool.query(
    'SELECT id, reference_no, fee_amount, fee_collected FROM grievances WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

exports.confirmForGrievance = async (req, res, next) => {
  try {
    const paid = await recordFeeByGrievanceId(req.params.id, req.body.transaction_id);
    res.json({ success: true, data: paid, message: 'Transaction ID saved' });
  } catch (err) {
    next(err);
  }
};

exports.getOrCreate = async (req, res, next) => {
  try {
    const g = await loadBasicGrievance(req.params.id);
    if (!g) return res.status(404).json({ success: false, message: 'Not found' });
    const payment = await getOrCreatePayment(g);
    res.json({ success: true, data: { ...payment, reference_no: g.reference_no } });
  } catch (err) {
    next(err);
  }
};

exports.getPublic = async (req, res, next) => {
  try {
    const row = await getPaymentByOrderRef(req.params.orderRef);
    if (!row) return res.status(404).json({ success: false, message: 'Payment order not found' });
    res.json({
      success: true,
      data: {
        ...serializePayment(row),
        reference_no: row.reference_no,
        citizen_name: row.citizen_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.demoConfirm = async (req, res, next) => {
  try {
    if (paymentMode() !== 'demo') {
      return res.status(403).json({
        success: false,
        message: 'Automatic test confirmation is only available in demo payment mode',
      });
    }
    const paid = await markPaid(req.params.orderRef, `UPI${Date.now()}`);
    res.json({ success: true, data: paid, message: 'Payment confirmed' });
  } catch (err) {
    next(err);
  }
};

exports.webhook = async (req, res, next) => {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || '';
    if (secret && req.headers['x-payment-secret'] !== secret && req.body.secret !== secret) {
      return res.status(401).json({ success: false, message: 'Invalid payment webhook secret' });
    }
    const orderRef = req.body.order_ref || req.body.orderRef;
    const transactionId = req.body.transaction_id || req.body.transactionId || req.body.utr;
    if (!orderRef || !transactionId) {
      return res.status(400).json({ success: false, message: 'order_ref and transaction_id are required' });
    }
    const paid = await markPaid(orderRef, transactionId, req.body.payer_vpa || null);
    res.json({ success: true, data: paid });
  } catch (err) {
    next(err);
  }
};
