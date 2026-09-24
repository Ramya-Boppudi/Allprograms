import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, TextField, Typography, Stepper, Step, StepLabel, Alert,
} from '@mui/material';
import api from '../../services/api';
import StatusChip from '../../components/StatusChip';
import AttachmentList from '../../components/AttachmentList';

const STAGE_STEPS = ['DRAFT_SAVED', 'WITH_PRO', 'WITH_DIVISION', 'WITH_PRO_REVIEW', 'COMPLETED'];

export default function TrackPage() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get('ref') || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const search = async (value = ref) => {
    if (!value.trim()) return;
    setError('');
    try {
      const { data: res } = await api.get('/grievances/track', {
        params: { referenceNo: value.trim() },
      });
      setData(res.data);
    } catch (err) {
      setData(null);
      setError(err.response?.data?.message || 'Reference ID not found');
    }
  };

  useEffect(() => {
    if (params.get('ref')) search(params.get('ref'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = data ? Math.max(0, STAGE_STEPS.indexOf(data.stage)) : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Track grievance / ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the Reference ID generated when the concern was saved.
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            label="Reference ID"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            sx={{ minWidth: 320 }}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button variant="contained" onClick={() => search()}>Search</Button>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {data && (
          <Box mt={2}>
            <Box display="flex" gap={1} alignItems="center" mb={2}>
              <Typography variant="h6">{data.reference_no}</Typography>
              <StatusChip status={data.status} publicStatus={data.public_status} />
            </Box>
            <Typography><b>Name:</b> {data.citizen_name}</Typography>
            <Typography><b>District / Taluk:</b> {data.district_name} / {data.taluk}</Typography>
            <Typography><b>Grievance:</b> {data.grievance_type_name}</Typography>
            <Typography sx={{ mt: 1 }}><b>Description:</b> {data.description}</Typography>
            {(data.attachments || []).length > 0 && (
              <Box mt={1.5}>
                <Typography fontWeight={700} gutterBottom>Attachments</Typography>
                <AttachmentList attachments={data.attachments} />
              </Box>
            )}
            {data.action_taken && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <b>Action taken:</b> {data.action_taken}
              </Alert>
            )}
            <Stepper activeStep={active} alternativeLabel sx={{ mt: 3 }}>
              <Step><StepLabel>Created</StepLabel></Step>
              <Step><StepLabel>With PRO</StepLabel></Step>
              <Step><StepLabel>With Division (30 days)</StepLabel></Step>
              <Step><StepLabel>PRO review</StepLabel></Step>
              <Step><StepLabel>Completed</StepLabel></Step>
            </Stepper>
            <Box mt={3}>
              <Typography fontWeight={700} gutterBottom>Alerts</Typography>
              {(data.events || []).map((e) => (
                <Typography key={`${e.created_at}-${e.action}`} variant="body2" sx={{ mb: 0.5 }}>
                  {new Date(e.created_at).toLocaleString('en-IN')} — {e.remarks || e.action}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
