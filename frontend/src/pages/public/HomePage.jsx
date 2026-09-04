import React, { useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Grid, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SearchIcon from '@mui/icons-material/Search';
import LoginIcon from '@mui/icons-material/Login';

export default function HomePage() {
  const [ref, setRef] = useState('');
  const navigate = useNavigate();
  const steps = useMemo(() => [
    { n: '1', t: 'Register', d: 'Officials (or the public) save the concern. A Reference ID is generated.' },
    { n: '2', t: 'Forward to PRO', d: 'All official logins except PRO send the grievance to the Public Relation Officer.' },
    { n: '3', t: 'Assign division', d: 'PRO forwards it to the concerned Divisional Manager (1–5).' },
    { n: '4', t: '10-day action', d: 'The Divisional Manager records Action Taken and sends it back to PRO.' },
    { n: '5', t: 'Complete', d: 'PRO accepts the action, or reverts it. The public is alerted at every stage.' },
  ], []);

  return (
    <Box>
      <Card sx={{ mb: 3, background: 'linear-gradient(120deg,#063d28,#0d5c3d)', color: '#fff' }}>
        <CardContent sx={{ py: 4 }}>
          <Typography variant="h5">Register. Track. Redress.</Typography>
          <Typography sx={{ mt: 1, opacity: 0.92 }}>
            A time-bound public grievance system of the Karnataka State Board of Auqaf.
            Statuses: <b>Created</b>, <b>Pending</b>, <b>Completed</b>.
          </Typography>
          <Typography sx={{ mt: 1, color: '#f6e27a' }}>
            ದೂರು ದಾಖಲಿಸಿ · ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯಿಂದ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ · 10 ದಿನಗಳಲ್ಲಿ ಕ್ರಮ
          </Typography>
          <Box mt={3} display="flex" gap={1} flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search Reference ID  e.g. KSBA/GRV/2026/000001"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              sx={{ minWidth: 320, bgcolor: '#fff', borderRadius: 1 }}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SearchIcon />}
              onClick={() => navigate(`/track${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`)}
            >
              Track
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <AssignmentIcon color="primary" />
              <Typography variant="h6">File a grievance</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Login with mobile OTP, then submit name, district, taluk and concern.
              </Typography>
              <Button variant="contained" onClick={() => navigate('/file')}>ದೂರು ದಾಖಲಿಸಿ</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <SearchIcon color="primary" />
              <Typography variant="h6">Track by Reference ID</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No login needed. Enter the acknowledgement number to see status and action taken.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/track')}>Open tracker</Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <LoginIcon color="primary" />
              <Typography variant="h6">Officials</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Chairman, CEO, ACEO, CAO, Assistant Secretary, PRO and 5 Divisional Managers.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/staff/login')}>Official login</Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>How the grievance moves</Typography>
      <Grid container spacing={2}>
        {steps.map((s) => (
          <Grid key={s.n} size={{ xs: 12, md: 2.4 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" color="secondary">{s.n}</Typography>
                <Typography fontWeight={700}>{s.t}</Typography>
                <Typography variant="body2" color="text.secondary">{s.d}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
