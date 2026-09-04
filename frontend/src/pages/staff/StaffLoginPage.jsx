import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { BrandLockup } from '../../components/BrandLogos';
import { useBranding } from '../../context/BrandingContext';

export default function StaffLoginPage() {
  const { loginStaff } = useAuth();
  const { boardLogoUrl, stateEmblemUrl } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState('pro@ksba.karnataka.gov.in');
  const [password, setPassword] = useState('Ksba@123');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginStaff(email, password);
      navigate('/staff/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" sx={{ bgcolor: '#dde6f0' }}>
      <Card sx={{ width: 520, maxWidth: '95vw' }}>
        <Box sx={{ bgcolor: '#fff', p: 2, borderBottom: '3px solid #0d5c3d' }}>
          <BrandLockup
            boardLogoUrl={boardLogoUrl}
            stateEmblemUrl={stateEmblemUrl}
            subtitle="Karnataka State Board of Auqaf"
            title="Official login"
            height={52}
          />
        </Box>
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Demo password for all officials: <b>Ksba@123</b>
          </Alert>
          <Box component="form" onSubmit={submit} display="grid" gap={2}>
            <TextField label="Official email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" variant="contained" disabled={loading}>Sign in</Button>
            <Button onClick={() => navigate('/')}>Back to public portal</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
