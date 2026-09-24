import testPaymentQr from '../assets/test-payment-qr.png';

/**
 * Switch to 'razorpay' after merchant keys are ready.
 * Then fetchGrievancePayment() will call the Razorpay QR API instead of this test image.
 */
export const PAYMENT_PROVIDER = 'test';
export const TEST_FEE_AMOUNT = 10;
export const TEST_QR_SRC = testPaymentQr;

function storageKey(grievanceId) {
  return `ksba_test_payment_${grievanceId}`;
}

export function getTestPayment(grievanceId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(grievanceId)) || 'null');
    if (saved?.status) return { ...saved, qr_image_url: TEST_QR_SRC, provider: 'test' };
  } catch {
    /* ignore bad local data */
  }
  return {
    provider: 'test',
    status: 'PENDING',
    amount: TEST_FEE_AMOUNT,
    qr_image_url: TEST_QR_SRC,
    order_ref: `TEST-${grievanceId}`,
    transaction_id: null,
  };
}

export function confirmTestPayment(grievanceId) {
  const payment = {
    provider: 'test',
    status: 'PAID',
    amount: TEST_FEE_AMOUNT,
    qr_image_url: TEST_QR_SRC,
    order_ref: `TEST-${grievanceId}`,
    transaction_id: `TESTUPI${Date.now()}`,
    paid_at: new Date().toISOString(),
  };
  localStorage.setItem(storageKey(grievanceId), JSON.stringify(payment));
  return payment;
}
