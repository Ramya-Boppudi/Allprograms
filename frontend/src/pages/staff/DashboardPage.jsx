import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, MenuItem, TextField, Typography, Table, TableHead,
  TableRow, TableCell, TableBody, Stack,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import StatusChip from '../../components/StatusChip';

const STATUS_COLORS = { Created: '#0288d1', Pending: '#ed6c02', Completed: '#2e7d32' };
const PALETTE = [
  '#0d5c3d', '#c9a227', '#0288d1', '#ed6c02', '#6a1b9a', '#00838f',
  '#c62828', '#546e7a', '#2e7d32', '#ef6c00', '#3949ab', '#00897b',
  '#ad1457', '#5d4037', '#1565c0', '#9e9d24',
];

const GROUP_LABELS = {
  status: 'Status',
  district: 'District',
  grievance_type: 'Grievance type',
  division: 'Division',
};

function sliceColor(name, index) {
  return STATUS_COLORS[name] || PALETTE[index % PALETTE.length];
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    created: 0, pending: 0, completed: 0, overdue: 0, total: 0, slices: [],
  });
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [chartBy, setChartBy] = useState('status');
  const [chartDistrict, setChartDistrict] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartStatus, setChartStatus] = useState('');
  const [districts, setDistricts] = useState([]);
  const [types, setTypes] = useState([]);
  const navigate = useNavigate();

  const loadTable = async () => {
    const { data } = await api.get('/grievances', { params: { q, status } });
    setRows(data.data);
  };

  const loadChart = async () => {
    const { data } = await api.get('/grievances/dashboard', {
      params: {
        group_by: chartBy,
        district_id: chartDistrict || undefined,
        grievance_type_id: chartType || undefined,
        status: chartStatus || undefined,
      },
    });
    setStats(data.data);
  };

  useEffect(() => {
    api.get('/masters/districts').then((r) => setDistricts(r.data.data));
    api.get('/masters/grievance-types').then((r) => setTypes(r.data.data));
    loadTable();
  }, []);

  useEffect(() => {
    loadChart();
  }, [chartBy, chartDistrict, chartType, chartStatus]);

  const pie = useMemo(() => {
    const slices = (stats.slices || []).filter((s) => Number(s.value) > 0);
    if (slices.length <= 12) return slices;
    const top = slices.slice(0, 11);
    const rest = slices.slice(11).reduce((sum, s) => sum + Number(s.value), 0);
    return [...top, { name: 'Others', value: rest }];
  }, [stats.slices]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Main dashboard</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Personal details of the aggrieved person, grievance type, Reference ID search, Action Taken and status.
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography fontWeight={700} gutterBottom>Effective grievance redressal</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
            <TextField
              size="small"
              select
              label="View pie by"
              value={chartBy}
              onChange={(e) => setChartBy(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="status">Status</MenuItem>
              <MenuItem value="district">District</MenuItem>
              <MenuItem value="grievance_type">Grievance type</MenuItem>
              <MenuItem value="division">Division</MenuItem>
            </TextField>
            <TextField
              size="small"
              select
              label="District"
              value={chartDistrict}
              onChange={(e) => setChartDistrict(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All districts</MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Grievance type"
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">All types</MenuItem>
              {types.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Status"
              value={chartStatus}
              onChange={(e) => setChartStatus(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="CREATED">Created</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
            </TextField>
          </Stack>
          <Box height={pie.length > 8 ? 340 : 280}>
            {pie.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={pie.length <= 8}
                  >
                    {pie.map((e, i) => (
                      <Cell key={`${e.name}-${i}`} fill={sliceColor(e.name, i)} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ pt: 8, textAlign: 'center' }}>
                No grievances match these filters.
              </Typography>
            )}
          </Box>
          <Typography variant="body2">
            Showing {GROUP_LABELS[stats.group_by] || 'Status'} · Total {stats.total} · Overdue (beyond 10 days) {stats.overdue}
          </Typography>
        </CardContent>
      </Card>

      <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
        <TextField size="small" label="Search Reference ID / name / mobile" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 280 }} />
        <TextField size="small" select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ width: 160 }}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="CREATED">Created</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
        </TextField>
        <Button variant="contained" onClick={loadTable}>Search</Button>
        <Button variant="outlined" onClick={() => navigate('/staff/register')}>Register grievance</Button>
      </Stack>

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
              <TableCell>Status</TableCell>
              <TableCell>Due</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/staff/grievances/${r.id}`)}>
                <TableCell>{r.reference_no}</TableCell>
                <TableCell>{r.citizen_name}</TableCell>
                <TableCell>{r.citizen_mobile}</TableCell>
                <TableCell>{r.district_name}</TableCell>
                <TableCell>{r.taluk}</TableCell>
                <TableCell>{r.grievance_type_name}</TableCell>
                <TableCell><StatusChip status={r.status} /></TableCell>
                <TableCell>{r.due_date || '—'}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={8}>No grievances yet. Register one to generate a Reference ID.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  );
}
