import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import api from '../../services/api';

export default function PayPage() {
  const { orderRef } = useParams();
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState('');
  const confirming = useRef(false);

  const load = async () => {
    const { data } = await api.get(`/payments/${orderRef}`);
    setPayment(data.data);
    return data.data;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const current = await load();
        if (cancelled || !current || current.status === 'PAID' || current.mode !== 'demo') return;
        if (confirming.current) return;
        confirming.current = true;
        await api.post(`/payments/${orderRef}/demo-confirm`);
        if (!cancelled) await load();
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Payment order not found');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [orderRef]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  if (!payment) {
    return <Typography>Loading payment…</Typography>;
  }

  const paid = payment.status === 'PAID';

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Pay grievance fee</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Reference {payment.reference_no} · Order {payment.order_ref}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Amount:</b> ₹{Number(payment.amount).toFixed(2)}
        </Typography>
        {paid ? (
          <Alert severity="success">
            Payment received. Transaction ID: <b>{payment.transaction_id}</b>
          </Alert>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Scan this UPI QR or tap Pay to complete the Rs.{Number(payment.amount).toFixed(2)} fee.
              The officer screen will pick up the transaction ID automatically.
            </Alert>
            <Box textAlign="center" mb={2}>
              <Box
                component="img"
                src={payment.upi_qr_image_url}
                alt="UPI payment QR"
                sx={{ width: 220, height: 220, border: '1px solid #e0e0e0', p: 1, bgcolor: '#fff' }}
              />
            </Box>
            <Button variant="contained" href={payment.upi_link} fullWidth>
              Pay ₹{Number(payment.amount).toFixed(2)} with UPI
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
