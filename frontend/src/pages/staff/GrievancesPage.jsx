import React, { useEffect, useState } from 'react';
import {
  Box, Button, Card, Chip, MenuItem, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import StatusChip from '../../components/StatusChip';
import { useAuth } from '../../context/AuthContext';
import { canMonitorAll, canRegisterGrievance, filterOwnRegistrations, forwardedByLabel } from '../../config/roles';

export default function GrievancesPage() {
  const { user } = useAuth();
  const canRegister = canRegisterGrievance(user?.role_code);
  const showForwardedBy = canMonitorAll(user?.role_code);
  const isPro = user?.role_code === 'pro';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialDivision = searchParams.get('division_id') || '';

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [divisionFilter, setDivisionFilter] = useState(initialDivision);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadTable = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/grievances', {
        params: {
          q: q || undefined,
          status: status || undefined,
          division_id: divisionFilter && divisionFilter !== 'unassigned' ? divisionFilter : undefined,
        },
      });
      let list = data.data || [];
      if (canRegister) {
        list = filterOwnRegistrations(list, user);
      }
      if (divisionFilter === 'unassigned') {
        list = list.filter((r) => !r.division_id && !r.division_name);
      } else if (divisionFilter) {
        list = list.filter((r) => String(r.division_id) === String(divisionFilter));
      }
      setRows(list);
    } catch (err) {
      console.error('Failed to load grievances table:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/masters/divisions').then((r) => setDivisions(r.data.data || []));
  }, []);

  useEffect(() => {
    loadTable();
  }, [status, divisionFilter]);

  const handleSearchClick = () => {
    loadTable();
  };

  const handleReset = () => {
    setQ('');
    setStatus('');
    setDivisionFilter('');
    setSearchParams({});
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {canRegister ? 'Your registered grievances' : 'Grievances'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        {canRegister
          ? 'Only grievances you registered are listed here.'
          : 'Personal details of the aggrieved person, grievance type, Reference ID search, Action Taken, and assigned division.'}
      </Typography>

      {/* Search and Filters Bar */}
      <Card sx={{ p: 2, mb: 2.5 }}>
        <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            label="Search Reference ID / name / mobile"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchClick(); }}
            sx={{ minWidth: 280 }}
          />

          <TextField
            size="small"
            select
            label="Division"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All divisions</MenuItem>
            <MenuItem value="unassigned">Unassigned</MenuItem>
            {divisions.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            sx={{ width: 160 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="CREATED">Created</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
          </TextField>

          <Button variant="contained" onClick={handleSearchClick}>
            Search
          </Button>

          {(q || status || divisionFilter) && (
            <Button variant="text" color="secondary" onClick={handleReset}>
              Reset
            </Button>
          )}

          {canRegister && (
            <Box sx={{ ml: 'auto' }}>
              <Button variant="outlined" onClick={() => navigate('/staff/register')}>
                Register grievance
              </Button>
            </Box>
          )}
        </Stack>
      </Card>

      {/* Grievances Table */}
      <Card>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Reference ID</TableCell>
              <TableCell>Name of the person</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>District</TableCell>
              <TableCell>Taluk</TableCell>
              <TableCell>Grievance</TableCell>
              <TableCell>Assigned Division</TableCell>
              {showForwardedBy && <TableCell>Forwarded by</TableCell>}
              {isPro && <TableCell>Transaction ID</TableCell>}
              {isPro && <TableCell>PRO remarks</TableCell>}
              <TableCell>Status</TableCell>
              <TableCell>Due</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/staff/grievances/${r.id}`)}
              >
                <TableCell sx={{ fontWeight: 600 }}>{r.reference_no}</TableCell>
                <TableCell>{r.citizen_name}</TableCell>
                <TableCell>{r.citizen_mobile}</TableCell>
                <TableCell>{r.district_name}</TableCell>
                <TableCell>{r.taluk}</TableCell>
                <TableCell>{r.grievance_type_name}</TableCell>
                <TableCell>
                  {r.division_name ? (
                    <Chip
                      size="small"
                      label={r.division_name}
                      variant="outlined"
                      color="primary"
                      sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Unassigned
                    </Typography>
                  )}
                </TableCell>
                {showForwardedBy && (
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {forwardedByLabel(r)}
                    </Typography>
                  </TableCell>
                )}
                {isPro && (
                  <TableCell>{r.fee_transaction_id || '—'}</TableCell>
                )}
                {isPro && (
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap title={r.pro_remarks || ''}>
                      {r.pro_remarks || '—'}
                    </Typography>
                  </TableCell>
                )}
                <TableCell><StatusChip status={r.status} /></TableCell>
                <TableCell>{r.due_date || '—'}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={(showForwardedBy ? 10 : 9) + (isPro ? 2 : 0)} sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Loading grievances...' : 'No grievances match your search or filter criteria.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
