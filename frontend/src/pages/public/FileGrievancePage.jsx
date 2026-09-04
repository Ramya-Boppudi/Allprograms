import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, CardContent, MenuItem, TextField, Typography, Alert, Stack, Chip,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function FileGrievancePage() {
  const { citizen, loginCitizen } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(citizen ? 2 : 0);
  const [mobile, setMobile] = useState(citizen?.mobile || '');
  const [otp, setOtp] = useState('');
  const [types, setTypes] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({
    citizen_name: citizen?.name || '',
    citizen_email: citizen?.email || '',
    district_id: '',
    taluk: '',
    grievance_type_id: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/masters/grievance-types').then((r) => setTypes(r.data.data));
    api.get('/masters/districts').then((r) => setDistricts(r.data.data));
  }, []);

  const sendOtp = async () => {
    try {
      const { data } = await api.post('/public/auth/send-otp', { mobile });
      toast.success(data.message);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send OTP');
    }
  };

  const verify = async () => {
    try {
      await loginCitizen({
        mobile,
        otp,
        name: form.citizen_name,
        email: form.citizen_email,
      });
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      fd.append('citizen_mobile', mobile || citizen?.mobile || '');
      files.forEach((file) => fd.append('attachments', file));
      const { data } = await api.post('/grievances/public', fd);
      toast.success(`Registered: ${data.data.reference_no}`);
      navigate(`/track?ref=${encodeURIComponent(data.data.reference_no)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFiles = (e) => {
    const next = Array.from(e.target.files || []);
    setFiles(next.slice(0, 5));
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">File a public grievance / ದೂರು ದಾಖಲಿಸಿ</Typography>
        <Alert severity="info" sx={{ my: 2 }}>
          Until SMS is configured, use OTP <b>123456</b> for any valid mobile number.
          A Rs.10 fee is planned later and is not collected now.
        </Alert>

        {step < 2 && (
          <Stack spacing={2} maxWidth={420}>
            <TextField label="Mobile number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            {step === 0 && <Button variant="contained" onClick={sendOtp}>Send OTP</Button>}
            {step === 1 && (
              <>
                <TextField label="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
                <TextField label="Your name" value={form.citizen_name} onChange={set('citizen_name')} />
                <Button variant="contained" onClick={verify}>Verify & continue</Button>
              </>
            )}
          </Stack>
        )}

        {step === 2 && (
          <Box component="form" onSubmit={submit} display="grid" gap={2} maxWidth={640} mt={1}>
            <TextField required label="Name of the person" value={form.citizen_name} onChange={set('citizen_name')} />
            <TextField
              label="Email (optional, for alerts)"
              value={form.citizen_email}
              onChange={set('citizen_email')}
            />
            <TextField
              required
              select
              label="District"
              value={form.district_id}
              onChange={set('district_id')}
            >
              {districts.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
            </TextField>
            <TextField required label="Taluk" value={form.taluk} onChange={set('taluk')} />
            <TextField required select label="Grievance type" value={form.grievance_type_id} onChange={set('grievance_type_id')}>
              {types.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
            <TextField
              required
              multiline
              minRows={4}
              label="Complaint / issue / concern"
              value={form.description}
              onChange={set('description')}
            />
            <Box>
              <Typography fontWeight={700} sx={{ mb: 0.8 }}>Supporting documents (optional)</Typography>
              <Button variant="outlined" component="label">
                Choose files
                <input
                  hidden
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={onFiles}
                />
              </Button>
              {files.length > 0 && (
                <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                  {files.map((file) => (
                    <Chip key={`${file.name}-${file.size}`} label={file.name} onDelete={() => setFiles((cur) => cur.filter((f) => f !== file))} />
                  ))}
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.7 }}>
                PDF, JPG, PNG or Word. Max 8 MB each, up to 5 files.
              </Typography>
            </Box>
            <Button type="submit" variant="contained" disabled={saving}>
              Save and get Reference ID
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
