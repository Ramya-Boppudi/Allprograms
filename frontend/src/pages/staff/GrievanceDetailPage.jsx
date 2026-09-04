import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import api from '../../services/api';
import StatusChip from '../../components/StatusChip';
import AttachmentList from '../../components/AttachmentList';
import { useAuth } from '../../context/AuthContext';

export default function GrievanceDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [g, setG] = useState(null);
  const [divisions, setDivisions] = useState([]);
  const [divisionId, setDivisionId] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/grievances/${id}`);
    setG(data.data);
    setActionTaken(data.data.action_taken || '');
    if (data.data.division_id) setDivisionId(data.data.division_id);
  };

  useEffect(() => {
    load();
    api.get('/masters/divisions').then((r) => setDivisions(r.data.data));
  }, [id]);

  const act = async (path, body) => {
    try {
      await api.post(`/grievances/${id}/${path}`, body);
      toast.success('Updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const uploadFiles = async () => {
    if (!files.length) {
      toast.error('Choose at least one file');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((file) => fd.append('attachments', file));
      await api.post(`/grievances/${id}/attachments`, fd);
      toast.success('Documents uploaded');
      setFiles([]);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!g) return <Typography>Loading…</Typography>;

  const isPro = user?.role_code === 'pro';
  const isDm = user?.role_code === 'divisional_manager';
  const proNote = [...(g.events || [])]
    .reverse()
    .find((e) =>
      ['ASSIGNED_TO_DIVISION', 'REVERTED_TO_DIVISION'].includes(e.action)
      && e.remarks
      && !/^Forwarded to .+ \(10-day SLA\)$/.test(e.remarks)
    );

  return (
    <Box>
      <Button onClick={() => navigate('/staff/dashboard')} sx={{ mb: 1 }}>← Dashboard</Button>
      <Card>
        <CardContent>
          <Stack direction="row" gap={1} alignItems="center" mb={1}>
            <Typography variant="h6">{g.reference_no}</Typography>
            <StatusChip status={g.status} />
            {g.sla_overdue && <Alert severity="error" sx={{ py: 0 }}>SLA exceeded (10 days)</Alert>}
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Stage: {g.stage.replaceAll('_', ' ')} {g.due_date ? `· due ${g.due_date}` : ''}
          </Typography>

          <Typography><b>Name of the person:</b> {g.citizen_name}</Typography>
          <Typography><b>Contact number:</b> {g.citizen_mobile}</Typography>
          <Typography><b>District:</b> {g.district_name}</Typography>
          <Typography><b>Taluk:</b> {g.taluk}</Typography>
          <Typography><b>Grievance:</b> {g.grievance_type_name}</Typography>
          <Typography sx={{ mt: 1 }}><b>Description:</b> {g.description}</Typography>
          <Box mt={1.5} maxWidth={640}>
            <Typography fontWeight={700} gutterBottom>Attachments</Typography>
            <AttachmentList attachments={g.attachments} />
            {isPro && (
              <Box mt={1.5}>
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
                      <Chip
                        key={`${file.name}-${file.size}`}
                        label={file.name}
                        onDelete={() => setFiles((cur) => cur.filter((f) => f !== file))}
                      />
                    ))}
                  </Stack>
                )}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.7 }}>
                  PDF, JPG, PNG or Word. Max 8 MB each, up to 5 files.
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 1 }}
                  disabled={uploading || !files.length}
                  onClick={uploadFiles}
                >
                  Upload documents
                </Button>
              </Box>
            )}
          </Box>
          {isDm && proNote && (
            <Alert
              severity={proNote.action === 'REVERTED_TO_DIVISION' ? 'warning' : 'info'}
              sx={{ mt: 2, maxWidth: 640 }}
            >
              <Typography fontWeight={700} gutterBottom>
                {proNote.action === 'REVERTED_TO_DIVISION' ? 'Returned by PRO' : 'PRO remarks'}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{proNote.remarks}</Typography>
            </Alert>
          )}
          {g.action_taken && (
            <Alert sx={{ mt: 2 }} severity="success"><b>Action taken:</b> {g.action_taken}</Alert>
          )}

          <Box mt={3} display="grid" gap={2} maxWidth={640}>
            {!isPro && g.stage === 'DRAFT_SAVED' && (
              <Button variant="contained" onClick={() => act('forward-to-pro', { remarks })}>
                Forward to PRO
              </Button>
            )}

            {isPro && ['DRAFT_SAVED', 'WITH_PRO'].includes(g.stage) && (
              <>
                <TextField
                  required
                  multiline
                  minRows={3}
                  label="PRO remarks"
                  placeholder="Mention remarks for the Divisional Manager before forwarding"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <TextField
                  select
                  label="Forward to Divisional Manager"
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                >
                  {divisions.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name} {d.manager_name ? `— ${d.manager_name}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (!remarks.trim()) {
                      toast.error('Please enter remarks before forwarding');
                      return;
                    }
                    act('assign-division', { division_id: divisionId, remarks: remarks.trim() });
                  }}
                >
                  Forward to concerned Divisional Manager
                </Button>
              </>
            )}

            {isDm && g.stage === 'WITH_DIVISION' && (
              <>
                <TextField
                  multiline
                  minRows={3}
                  label="Action taken"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                />
                <Button variant="contained" onClick={() => act('submit-action', { action_taken: actionTaken })}>
                  Save action & forward to PRO
                </Button>
              </>
            )}

            {isPro && g.stage === 'WITH_PRO_REVIEW' && (
              <>
                <TextField
                  multiline
                  minRows={2}
                  label="PRO remarks (required to revert)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <Stack direction="row" gap={1}>
                  <Button color="warning" variant="outlined" onClick={() => act('revert', { remarks })}>
                    Revert to Divisional Manager
                  </Button>
                  <Button color="success" variant="contained" onClick={() => act('complete', { remarks })}>
                    Mark Completed
                  </Button>
                </Stack>
              </>
            )}
          </Box>

          <Box mt={4}>
            <Typography fontWeight={700} gutterBottom>Timeline</Typography>
            {(g.events || []).map((e) => (
              <Typography key={e.id} variant="body2" sx={{ mb: 0.7 }}>
                {new Date(e.created_at).toLocaleString('en-IN')} — {e.action.replaceAll('_', ' ')}
                {e.actor_name ? ` (${e.actor_name})` : ''}
                {e.remarks ? `: ${e.remarks}` : ''}
              </Typography>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
