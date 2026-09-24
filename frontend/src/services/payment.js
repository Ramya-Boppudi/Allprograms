import api from './api';
import { PAYMENT_PROVIDER, TEST_QR_SRC, confirmTestPayment, getTestPayment } from '../config/payment';

function withTestQr(payment) {
  if (!payment) return payment;
  return {
    ...payment,
    provider: payment.provider || PAYMENT_PROVIDER,
    qr_image_url: payment.qr_image_url || TEST_QR_SRC,
  };
}

/** Load QR + payment status. Always prefer the API so the transaction ID comes from the database. */
export async function fetchGrievancePayment(grievanceId) {
  try {
    const { data } = await api.get(`/grievances/${grievanceId}/payment`);
    return withTestQr(data.data);
  } catch {
    const local = getTestPayment(grievanceId);
    if (local.transaction_id) {
      try {
        const { data } = await api.post(`/grievances/${grievanceId}/payment/confirm`, {
          transaction_id: local.transaction_id,
        });
        return withTestQr({ ...local, ...data.data });
      } catch {
        return local;
      }
    }
    return local;
  }
}

export async function captureTestPayment(grievanceId) {
  const local = confirmTestPayment(grievanceId);
  const { data } = await api.post(`/grievances/${grievanceId}/payment/confirm`, {
    transaction_id: local.transaction_id,
  });
  return withTestQr({
    ...local,
    ...data.data,
    transaction_id: data.data?.transaction_id || local.transaction_id,
    status: 'PAID',
  });
}
