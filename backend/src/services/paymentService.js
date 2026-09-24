const pool = require('../config/db');
const { addEvent } = require('./notificationService');

function paymentMode() {
  return String(process.env.PAYMENT_MODE || 'demo').toLowerCase();
}

function feeAmount(grievance) {
  const fromEnv = Number(process.env.GRIEVANCE_FEE_AMOUNT);
  if (fromEnv > 0) return fromEnv.toFixed(2);
  const fromRow = Number(grievance?.fee_amount);
  return (fromRow > 0 ? fromRow : 10).toFixed(2);
}

function frontendBase() {
  return String(process.env.FRONTEND_URL || 'http://localhost:3010/grievance/').replace(/\/?$/, '/');
}

function buildOrderRef(grievanceId) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `KSBA${grievanceId}${stamp}`.slice(0, 35);
}

function buildUpiLink({ amount, orderRef, referenceNo }) {
  const pa = process.env.UPI_VPA || 'karwakf@upi';
  const pn = process.env.UPI_PAYEE_NAME || 'Karnataka State Board of Auqaf';
  const tn = `Grievance fee ${referenceNo}`;
  const params = new URLSearchParams({
    pa,
    pn,
    am: String(amount),
    cu: 'INR',
    tn,
    tr: orderRef,
  });
  return `upi://pay?${params.toString()}`;
}

function qrImageUrl(data) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}`;
}

function serializePayment(row) {
  if (!row) return null;
  return {
    ...row,
    amount: Number(row.amount),
    qr_image_url: qrImageUrl(row.pay_url),
    upi_qr_image_url: qrImageUrl(row.upi_link),
    mode: paymentMode(),
    payee_name: process.env.UPI_PAYEE_NAME || 'Karnataka State Board of Auqaf',
    upi_vpa: process.env.UPI_VPA || 'karwakf@upi',
  };
}

async function getLatestPayment(grievanceId) {
  const [rows] = await pool.query(
    `SELECT * FROM grievance_payments WHERE grievance_id = ? ORDER BY id DESC LIMIT 1`,
    [grievanceId]
  );
  return rows[0] || null;
}

async function getPaymentByOrderRef(orderRef) {
  const [rows] = await pool.query(
    `SELECT p.*, g.reference_no, g.citizen_name, g.fee_collected
     FROM grievance_payments p
     JOIN grievances g ON g.id = p.grievance_id
     WHERE p.order_ref = ?`,
    [orderRef]
  );
  return rows[0] || null;
}

async function getOrCreatePayment(grievance) {
  const existing = await getLatestPayment(grievance.id);
  if (existing && existing.status === 'PAID') {
    return serializePayment(existing);
  }
  if (existing && existing.status === 'PENDING') {
    return serializePayment(existing);
  }

  const amount = feeAmount(grievance);
  const orderRef = buildOrderRef(grievance.id);
  const upiLink = buildUpiLink({
    amount,
    orderRef,
    referenceNo: grievance.reference_no,
  });
  const payUrl = `${frontendBase()}pay/${orderRef}`;

  await pool.query(
    `INSERT INTO grievance_payments (grievance_id, order_ref, amount, status, upi_link, pay_url)
     VALUES (?, ?, ?, 'PENDING', ?, ?)`,
    [grievance.id, orderRef, amount, upiLink, payUrl]
  );
  await pool.query(
    'UPDATE grievances SET fee_applicable = 1, fee_amount = ? WHERE id = ?',
    [amount, grievance.id]
  );
  return serializePayment(await getLatestPayment(grievance.id));
}

async function markPaid(orderRef, transactionId, payerVpa = null) {
  const payment = await getPaymentByOrderRef(orderRef);
  if (!payment) {
    const err = new Error('Payment order not found');
    err.statusCode = 404;
    throw err;
  }
  if (payment.status === 'PAID') {
    return serializePayment(payment);
  }

  const txn = String(transactionId || '').trim() || `UPI${Date.now()}`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE grievance_payments
       SET status = 'PAID', transaction_id = ?, payer_vpa = ?, paid_at = NOW()
       WHERE id = ?`,
      [txn, payerVpa, payment.id]
    );
    try {
      await conn.query(
        `UPDATE grievances
         SET fee_applicable = 1, fee_collected = 1, fee_transaction_id = ?
         WHERE id = ?`,
        [txn, payment.grievance_id]
      );
    } catch (err) {
      if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      await conn.query(
        'UPDATE grievances SET fee_applicable = 1, fee_collected = 1 WHERE id = ?',
        [payment.grievance_id]
      );
    }
    await addEvent(conn, {
      grievanceId: payment.grievance_id,
      actorType: 'PUBLIC',
      actorId: null,
      action: 'FEE_COLLECTED',
      remarks: `Grievance fee paid. Transaction ID: ${txn}`,
    });
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return serializePayment(await getLatestPayment(payment.grievance_id));
}

async function recordFeeByGrievanceId(grievanceId, transactionId) {
  const txn = String(transactionId || '').trim() || `TESTUPI${Date.now()}`;
  let g;
  try {
    const [gRows] = await pool.query(
      'SELECT id, reference_no, fee_amount, fee_collected, fee_transaction_id FROM grievances WHERE id = ?',
      [grievanceId]
    );
    g = gRows[0];
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [gRows] = await pool.query(
      'SELECT id, reference_no, fee_amount, fee_collected FROM grievances WHERE id = ?',
      [grievanceId]
    );
    g = gRows[0];
  }
  if (!g) {
    const err = new Error('Not found');
    err.statusCode = 404;
    throw err;
  }
  if (g.fee_transaction_id) {
    const latest = await getLatestPayment(grievanceId);
    return {
      ...(latest ? serializePayment(latest) : {}),
      transaction_id: g.fee_transaction_id,
      status: 'PAID',
      amount: Number(g.fee_amount || 10),
    };
  }

  try {
    const payment = await getOrCreatePayment(g);
    return await markPaid(payment.order_ref, txn);
  } catch (err) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      try {
        await conn.query(
          `UPDATE grievances
           SET fee_applicable = 1, fee_collected = 1, fee_transaction_id = ?
           WHERE id = ?`,
          [txn, grievanceId]
        );
      } catch (inner) {
        if (inner.code !== 'ER_BAD_FIELD_ERROR') throw inner;
        await conn.query(
          'UPDATE grievances SET fee_applicable = 1, fee_collected = 1 WHERE id = ?',
          [grievanceId]
        );
      }
      await addEvent(conn, {
        grievanceId,
        actorType: 'STAFF',
        actorId: null,
        action: 'FEE_COLLECTED',
        remarks: `Grievance fee paid. Transaction ID: ${txn}`,
      });
      await conn.commit();
    } catch (inner) {
      await conn.rollback();
      throw inner;
    } finally {
      conn.release();
    }
    return { status: 'PAID', transaction_id: txn, amount: Number(g.fee_amount || 10) };
  }
}

async function isFeePaid(grievanceId) {
  const [gRows] = await pool.query(
    'SELECT fee_collected, fee_transaction_id FROM grievances WHERE id = ?',
    [grievanceId]
  );
  if (gRows[0] && Number(gRows[0].fee_collected) === 1) return true;
  const [pRows] = await pool.query(
    `SELECT id FROM grievance_payments WHERE grievance_id = ? AND status = 'PAID' LIMIT 1`,
    [grievanceId]
  );
  return Boolean(pRows.length);
}

module.exports = {
  paymentMode,
  serializePayment,
  getLatestPayment,
  getPaymentByOrderRef,
  getOrCreatePayment,
  markPaid,
  recordFeeByGrievanceId,
  isFeePaid,
  qrImageUrl,
};
