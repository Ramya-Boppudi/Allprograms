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
import { canMonitorAll, forwardedByLabel } from '../../config/roles';
import PaymentQrCard from '../../components/PaymentQrCard';
import { captureTestPayment, fetchGrievancePayment } from '../../services/payment';
import { PAYMENT_PROVIDER } from '../../config/payment';

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
  const [payment, setPayment] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/grievances/${id}`);
    setG(data.data);
    const events = data.data.events || [];
    const hasPriorAction = events.some((e) => e.action === 'ACTION_FORWARDED_TO_PRO');
    const wasReverted = events.some((e) => e.action === 'REVERTED_TO_DIVISION');
    setActionTaken(hasPriorAction && wasReverted ? '' : (data.data.action_taken || ''));
    if (data.data.division_id) setDivisionId(data.data.division_id);
    if (data.data.fee_transaction_id || data.data.payment?.transaction_id) {
      setPayment((cur) => ({
        ...(cur || {}),
        ...(data.data.payment || {}),
        status: 'PAID',
        transaction_id: data.data.fee_transaction_id || data.data.payment.transaction_id,
      }));
    }
  };

  const loadPayment = async () => {
    const data = await fetchGrievancePayment(id);
    setPayment(data);
    return data;
  };

  useEffect(() => {
    load();
    loadPayment();
    api.get('/masters/divisions').then((r) => setDivisions(r.data.data));
  }, [id]);

  useEffect(() => {
    if (PAYMENT_PROVIDER === 'test' || !payment || payment.status === 'PAID') return undefined;
    const timer = setInterval(async () => {
      const next = await loadPayment();
      if (next?.status === 'PAID') {
        toast.success(`Payment received. Transaction ID: ${next.transaction_id}`);
        await load();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, payment?.status, payment?.order_ref]);

  const confirmTestPayment = async () => {
    try {
      const paid = await captureTestPayment(id);
      setPayment(paid);
      await load();
      toast.success(`Transaction ID saved: ${paid.transaction_id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the transaction ID to the database. Deploy/restart the API.');
    }
  };

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
  const isMonitor = canMonitorAll(user?.role_code);
  const proNote = [...(g.events || [])]
    .reverse()
    .find((e) =>
      ['ASSIGNED_TO_DIVISION', 'REVERTED_TO_DIVISION'].includes(e.action)
      && e.remarks
      && !/^Forwarded to .+ \(\d+-day SLA\)$/.test(e.remarks)
    );

  const previousActions = (g.events || []).filter(
    (e) => e.action === 'ACTION_FORWARDED_TO_PRO' && e.remarks
  );
  const wasReverted = (g.events || []).some((e) => e.action === 'REVERTED_TO_DIVISION');
  const canForward = isPro && ['DRAFT_SAVED', 'WITH_PRO'].includes(g.stage);
  const proRemarks = (g.events || []).filter((e) =>
    ['ASSIGNED_TO_DIVISION', 'REVERTED_TO_DIVISION', 'COMPLETED'].includes(e.action)
    && e.remarks
    && !/^Forwarded to .+ \(\d+-day SLA\)$/.test(e.remarks)
  );
  const txnId = payment?.transaction_id || g.fee_transaction_id;

  return (
    <Box>
      <Button onClick={() => navigate('/staff/dashboard')} sx={{ mb: 1 }}>← Dashboard</Button>
      <Card>
        <CardContent>
          <Stack direction="row" gap={1} alignItems="center" mb={1} flexWrap="wrap">
            <Typography variant="h6">{g.reference_no}</Typography>
            <StatusChip status={g.status} />
            {g.sla_overdue && <Alert severity="error" sx={{ py: 0 }}>SLA exceeded (30 days)</Alert>}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Stage: {g.stage.replaceAll('_', ' ')} {g.due_date ? `· due ${g.due_date}` : ''}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(280px, 0.9fr)' },
              gap: 3,
              alignItems: 'start',
            }}
          >
            <Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 1.2,
                  mb: 2,
                }}
              >
                <Typography><b>Name of the person:</b> {g.citizen_name}</Typography>
                <Typography><b>Contact number:</b> {g.citizen_mobile}</Typography>
                <Typography><b>District:</b> {g.district_name}</Typography>
                <Typography><b>Taluk:</b> {g.taluk}</Typography>
                <Typography><b>Grievance:</b> {g.grievance_type_name}</Typography>
                {isMonitor && (
                  <Typography>
                    <b>Forwarded by:</b> {forwardedByLabel(g)}
                    {g.division_name ? ` · ${g.division_name}` : ''}
                  </Typography>
                )}
              </Box>
              <Typography sx={{ mb: 2 }}><b>Description:</b> {g.description}</Typography>

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

              {isPro && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    border: '1px solid #d7e3db',
                    borderRadius: 2,
                    bgcolor: '#f7fbf8',
                  }}
                >
                  <Typography fontWeight={700} gutterBottom>Payment & PRO remarks</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <b>Transaction ID:</b> {txnId || 'Not captured yet'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <b>Fee status:</b>{' '}
                    {payment?.status === 'PAID' || g.fee_collected ? 'Paid' : 'Pending'}
                    {payment?.amount ? ` · ₹${Number(payment.amount).toFixed(2)}` : ''}
                  </Typography>
                  {!txnId && (
                    <Button variant="outlined" size="small" sx={{ mt: 1 }} onClick={confirmTestPayment}>
                      Capture and save transaction ID
                    </Button>
                  )}
                  {proRemarks.length ? (
                    proRemarks.map((e) => (
                      <Typography key={e.id || `${e.action}-${e.created_at}`} variant="body2" sx={{ mt: 1 }}>
                        <b>{e.action.replaceAll('_', ' ')}:</b> {e.remarks}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      No PRO remarks recorded yet.
                    </Typography>
                  )}
                </Box>
              )}
              {isDm && proNote && (
                <Alert
                  severity={proNote.action === 'REVERTED_TO_DIVISION' ? 'warning' : 'info'}
                  sx={{ mt: 2 }}
                >
                  <Typography fontWeight={700} gutterBottom>
                    {proNote.action === 'REVERTED_TO_DIVISION' ? 'Returned by PRO' : 'PRO remarks'}
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>{proNote.remarks}</Typography>
                </Alert>
              )}
              {!(isDm && g.stage === 'WITH_DIVISION') && previousActions.length > 0 && (
                <Box mt={2}>
                  {previousActions.map((e, index) => (
                    <Alert key={e.id || `${e.created_at}-${index}`} sx={{ mt: index ? 1 : 0 }} severity="success">
                      <Typography fontWeight={700} gutterBottom>
                        {index === 0 ? 'Action taken' : `Action taken (update ${index + 1})`}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{e.remarks}</Typography>
                    </Alert>
                  ))}
                </Box>
              )}
              {!(isDm && g.stage === 'WITH_DIVISION') && !previousActions.length && g.action_taken && (
                <Alert sx={{ mt: 2 }} severity="success"><b>Action taken:</b> {g.action_taken}</Alert>
              )}

              <Box mt={3}>
                <Typography fontWeight={700} gutterBottom>Timeline</Typography>
                {(g.events || []).map((e) => (
                  <Typography key={e.id} variant="body2" sx={{ mb: 0.7 }}>
                    {new Date(e.created_at).toLocaleString('en-IN')} — {e.action.replaceAll('_', ' ')}
                    {e.actor_name ? ` (${e.actor_name})` : ''}
                    {e.remarks ? `: ${e.remarks}` : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gap: 2, position: { md: 'sticky' }, top: { md: 88 } }}>
              {!isPro && g.stage === 'DRAFT_SAVED' && (
                <Button variant="contained" onClick={() => act('forward-to-pro', { remarks })}>
                  Forward to PRO
                </Button>
              )}

              {canForward && (
                <>
                  <PaymentQrCard payment={payment} onConfirmTest={confirmTestPayment} />
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
                    disabled={payment?.status !== 'PAID'}
                    onClick={() => {
                      if (payment?.status !== 'PAID') {
                        toast.error('Wait for the grievance fee payment before forwarding');
                        return;
                      }
                      if (!remarks.trim()) {
                        toast.error('Please enter remarks before forwarding');
                        return;
                      }
                      act('assign-division', { division_id: divisionId, remarks: remarks.trim() });
                    }}
                  >
                    Forward to concerned Divisional Manager
                  </Button>
                  {payment?.status !== 'PAID' && (
                    <Typography variant="caption" color="text.secondary">
                      This button stays disabled until the citizen pays and the transaction ID is captured.
                    </Typography>
                  )}
                </>
              )}

              {isDm && g.stage === 'WITH_DIVISION' && (
                <>
                  {previousActions.map((e, index) => (
                    <TextField
                      key={e.id || `${e.created_at}-${index}`}
                      multiline
                      minRows={3}
                      label={index === 0 ? 'Action taken' : `Previous action taken (${index + 1})`}
                      value={e.remarks}
                      disabled
                    />
                  ))}
                  <TextField
                    multiline
                    minRows={3}
                    label={wasReverted && previousActions.length ? 'New action taken' : 'Action taken'}
                    placeholder={wasReverted && previousActions.length ? 'Enter a new action after the revert' : ''}
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
                  <Stack direction="row" gap={1} flexWrap="wrap">
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
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
