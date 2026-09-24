import React from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';

export default function PaymentQrCard({ payment, onConfirmTest }) {
  if (!payment) {
    return <Typography color="text.secondary">Preparing payment QR…</Typography>;
  }

  const paid = payment.status === 'PAID';
  const amount = Number(payment.amount || 0).toFixed(2);
  const isTest = payment.provider === 'test';

  if (paid) {
    return (
      <Alert severity="success">
        Grievance fee of ₹{amount} received.
        {' '}Transaction ID: <b>{payment.transaction_id}</b>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2, border: '1px solid #d7e3db', borderRadius: 2, bgcolor: '#f7fbf8', width: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography fontWeight={700}>Grievance fee QR</Typography>
        <Chip size="small" color="warning" label={isTest ? 'Test QR' : 'Payment pending'} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Ask the citizen to scan this QR and pay <b>₹{amount}</b>.
        {isTest
          ? ' This is a test QR. After they pay, capture the test transaction ID below. Razorpay dynamic QR will replace this later.'
          : ' The transaction ID will appear here automatically after payment.'}
      </Typography>
      <Box textAlign="center">
        <Box
          component="img"
          src={payment.qr_image_url}
          alt="Grievance fee QR"
          sx={{ width: 220, height: 220, border: '1px solid #e0e0e0', p: 1, bgcolor: '#fff' }}
        />
      </Box>
      {isTest && (
        <Button variant="outlined" fullWidth sx={{ mt: 1.5 }} onClick={onConfirmTest}>
          Capture test transaction ID
        </Button>
      )}
    </Box>
  );
}
