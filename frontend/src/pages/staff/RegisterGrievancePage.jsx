import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function RegisterGrievancePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [types, setTypes] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    citizen_name: '',
    citizen_mobile: '',
    citizen_email: '',
    district_id: '',
    taluk: '',
    grievance_type_id: '',
    description: '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    api.get('/masters/grievance-types').then((r) => setTypes(r.data.data));
    api.get('/masters/districts').then((r) => setDistricts(r.data.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      files.forEach((file) => fd.append('attachments', file));
      const { data } = await api.post('/grievances', fd);
      toast.success(`Saved. Reference ID: ${data.data.reference_no}`);
      navigate(`/staff/grievances/${data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Register public concern</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Logged in as {user?.name}. Saving generates a Reference ID immediately.
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Rs.10 complaint fee is designed in the database but is switched off until KSBA confirms collection.
        </Alert>
        <Box component="form" onSubmit={submit} display="grid" gap={2} maxWidth={720}>
          <TextField required label="Name of the person" value={form.citizen_name} onChange={set('citizen_name')} />
          <TextField required label="Contact number" value={form.citizen_mobile} onChange={set('citizen_mobile')} />
          <TextField
            label="Email (optional)"
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
          <TextField required multiline minRows={4} label="Complaint / issue / concern" value={form.description} onChange={set('description')} />
          <Box>
            <Typography fontWeight={700} sx={{ mb: 0.8 }}>Supporting documents (optional)</Typography>
            <Button variant="outlined" component="label">
              Choose files
              <input
                hidden
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
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
          <Button type="submit" variant="contained" disabled={saving}>Save & generate Reference ID</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
