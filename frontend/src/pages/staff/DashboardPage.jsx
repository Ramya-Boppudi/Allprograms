import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, MenuItem, TextField, Typography, Stack,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { canRegisterGrievance, filterOwnRegistrations } from '../../config/roles';

const STATUS_COLORS = {
  Completed: '#2e7d32',
  Pending: '#ed6c02',
  Created: '#0288d1',
};

const DIVISION_PALETTE = [
  '#0d5c3d', '#0288d1', '#6a1b9a', '#c9a227', '#00838f',
  '#ef6c00', '#546e7a', '#c62828', '#3949ab', '#00897b',
];

const MONTHLY_PALETTE = [
  '#1565c0', '#0288d1', '#0097a7', '#00796b', '#2e7d32',
  '#5c6bc0', '#8e24aa', '#d81b60', '#f57c00', '#455a64',
];

const TIMELINE_COLORS = {
  '0 - 10 Days': '#2e7d32',
  '11 - 15 Days': '#ed6c02',
  '> 15 Days': '#c62828',
};

const REPEAT_PALETTE = [
  '#e65100', '#c2185b', '#7b1fa2', '#1976d2', '#00796b',
  '#f57c00', '#512da8', '#0097a7', '#689f38', '#5d4037',
];

function getStatusColor(name, index) {
  return STATUS_COLORS[name] || '#78909c';
}

function getDivisionColor(name, index) {
  if (name === 'Unassigned') return '#78909c';
  return DIVISION_PALETTE[index % DIVISION_PALETTE.length];
}

function getMonthlyColor(name, index) {
  return MONTHLY_PALETTE[index % MONTHLY_PALETTE.length];
}

function getTimelineColor(name) {
  return TIMELINE_COLORS[name] || '#78909c';
}

function getRepeatColor(name, index) {
  return REPEAT_PALETTE[index % REPEAT_PALETTE.length];
}

function buildStatsFromItems(items) {
  const created = items.filter((g) => g.status === 'CREATED').length;
  const pending = items.filter((g) => g.status === 'PENDING').length;
  const completed = items.filter((g) => g.status === 'COMPLETED').length;
  const overdue = items.filter((g) => {
    if (g.sla_overdue) return true;
    if (g.stage === 'WITH_DIVISION' && g.due_date) {
      return new Date(`${g.due_date}T23:59:59`) < new Date();
    }
    return false;
  }).length;
  const now = new Date();
  const this_month = items.filter((g) => {
    if (!g.created_at) return false;
    const d = new Date(g.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const divMap = {};
  const monthMap = {};
  const mobileMap = {};
  let d_0_10 = 0;
  let d_11_15 = 0;
  let d_above_15 = 0;
  for (const g of items) {
    const divName = g.division_name || 'Unassigned';
    divMap[divName] = (divMap[divName] || 0) + 1;
    if (g.created_at) {
      const createdAt = new Date(g.created_at);
      const monthKey = createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthMap[monthKey] = (monthMap[monthKey] || 0) + 1;
      const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 10) d_0_10 += 1;
      else if (days <= 15) d_11_15 += 1;
      else d_above_15 += 1;
    }
    const mobile = (g.citizen_mobile || '').trim();
    if (mobile) {
      if (!mobileMap[mobile]) {
        mobileMap[mobile] = { mobile, name: g.citizen_name || 'Citizen', value: 0 };
      }
      mobileMap[mobile].value += 1;
    }
  }

  const status_slices = [
    { name: 'Completed', value: completed },
    { name: 'Pending', value: pending },
    ...(created > 0 ? [{ name: 'Created', value: created }] : []),
  ];
  const repeat_slices = Object.values(mobileMap)
    .filter((x) => x.value > 1)
    .sort((a, b) => b.value - a.value)
    .map((x) => ({
      name: `${x.mobile} (${x.name})`,
      mobile: x.mobile,
      citizen_name: x.name,
      value: x.value,
    }));

  return {
    created,
    pending,
    completed,
    overdue,
    this_month,
    total: items.length,
    repeat_count: repeat_slices.length,
    status_slices,
    division_slices: Object.entries(divMap).map(([name, value]) => ({ name, value })),
    monthly_slices: Object.entries(monthMap).map(([name, value]) => ({ name, value })),
    timeline_slices: [
      { name: '0 - 10 Days', value: d_0_10 },
      { name: '11 - 15 Days', value: d_11_15 },
      { name: '> 15 Days', value: d_above_15 },
    ],
    repeat_slices,
    slices: status_slices,
  };
}

function PieCard({
  title, subtitle, badge, data = [], getColor, height = 260,
  emptyMessage = 'No grievances match this filter.', onSliceClick,
}) {
  const activeSlices = useMemo(() => {
    return (data || []).filter((s) => Number(s.value) > 0);
  }, [data]);

  const total = useMemo(() => {
    return activeSlices.reduce((sum, s) => sum + Number(s.value), 0);
  }, [activeSlices]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {badge && (
            <Chip size="small" label={badge} color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
          )}
        </Stack>

        <Box sx={{ height, width: '100%', mt: 1, position: 'relative' }}>
          {activeSlices.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeSlices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  innerRadius={25}
                  label={activeSlices.length <= 6}
                  onClick={(entry) => onSliceClick && onSliceClick(entry)}
                  style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                >
                  {activeSlices.map((entry, idx) => (
                    <Cell key={`${entry.name}-${idx}`} fill={getColor(entry.name, idx)} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} grievances`, name]} />
                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Stack justifyContent="center" alignItems="center" height="100%">
              <Typography variant="body2" color="text.secondary">
                {emptyMessage}
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto', pt: 1 }}>
          {onSliceClick && activeSlices.length > 0 ? (
            <Typography variant="caption" color="primary" sx={{ fontStyle: 'italic', cursor: 'pointer' }}>
              Tip: Click slice to view grievances
            </Typography>
          ) : <Box />}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            Count: {total}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BarCard({
  title, subtitle, badge, data = [], getColor, defaultColor = '#0288d1', height = 260, xAngle = 0,
}) {
  const activeBars = useMemo(() => {
    return (data || []).map((s) => ({
      name: s.name,
      value: Number(s.value || 0),
    }));
  }, [data]);

  const total = useMemo(() => {
    return activeBars.reduce((sum, s) => sum + Number(s.value), 0);
  }, [activeBars]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {badge && (
            <Chip size="small" label={badge} color="primary" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
          )}
        </Stack>

        <Box sx={{ height, width: '100%', mt: 1, position: 'relative' }}>
          {activeBars.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={activeBars}
                margin={{ top: 15, right: 15, left: -20, bottom: xAngle ? 30 : 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#666' }}
                  angle={xAngle}
                  textAnchor={xAngle ? 'end' : 'middle'}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#666' }}
                />
                <Tooltip
                  formatter={(val) => [`${val} grievances`, 'Count']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 12 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {activeBars.map((entry, idx) => (
                    <Cell
                      key={`bar-${entry.name}-${idx}`}
                      fill={getColor ? getColor(entry.name, idx) : defaultColor}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Stack justifyContent="center" alignItems="center" height="100%">
              <Typography variant="body2" color="text.secondary">
                No grievances match this filter.
              </Typography>
            </Stack>
          )}
        </Box>

        <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 'auto', pt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            Count: {total}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const canRegister = canRegisterGrievance(user?.role_code);
  const [stats, setStats] = useState({
    created: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    this_month: 0,
    total: 0,
    repeat_count: 0,
    status_slices: [],
    division_slices: [],
    monthly_slices: [],
    timeline_slices: [],
    repeat_slices: [],
    slices: [],
  });
  const [chartDistrict, setChartDistrict] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartStatus, setChartStatus] = useState('');
  const [districts, setDistricts] = useState([]);
  const [types, setTypes] = useState([]);
  const navigate = useNavigate();

  const loadChart = async () => {
    try {
      if (canRegister && user?.id) {
        const listRes = await api.get('/grievances', {
          params: { status: chartStatus || undefined },
        });
        let items = filterOwnRegistrations(listRes.data?.data || [], user);
        if (chartDistrict) items = items.filter((g) => Number(g.district_id) === Number(chartDistrict));
        if (chartType) items = items.filter((g) => Number(g.grievance_type_id) === Number(chartType));
        setStats(buildStatsFromItems(items));
        return;
      }

      const { data } = await api.get('/grievances/dashboard', {
        params: {
          district_id: chartDistrict || undefined,
          grievance_type_id: chartType || undefined,
          status: chartStatus || undefined,
        },
      });
      const dash = data?.data || {};

      // If backend returns all specialized slices directly, use them immediately
      if (dash.status_slices?.length && dash.division_slices && dash.monthly_slices && dash.timeline_slices && dash.repeat_slices) {
        setStats(dash);
        return;
      }

      // Backward-compatibility fallback (e.g., when pointing to test server before deploy)
      let status_slices = dash.status_slices;
      if (!status_slices || !status_slices.length) {
        status_slices = [
          { name: 'Completed', value: Number(dash.completed || 0) },
          { name: 'Pending', value: Number(dash.pending || 0) },
          ...(Number(dash.created || 0) > 0 ? [{ name: 'Created', value: Number(dash.created || 0) }] : []),
        ];
      }

      let division_slices = dash.division_slices || [];
      if (!division_slices.length) {
        try {
          const divRes = await api.get('/grievances/dashboard', {
            params: {
              group_by: 'division',
              district_id: chartDistrict || undefined,
              grievance_type_id: chartType || undefined,
              status: chartStatus || undefined,
            },
          });
          division_slices = divRes.data?.data?.slices || [];
        } catch {
          // ignore
        }
      }

      let monthly_slices = dash.monthly_slices || [];
      let timeline_slices = dash.timeline_slices || [];
      let repeat_slices = dash.repeat_slices || [];
      let this_month = dash.this_month || 0;

      if (!monthly_slices.length || !timeline_slices.length || !repeat_slices.length) {
        try {
          const listRes = await api.get('/grievances', {
            params: {
              status: chartStatus || undefined,
            },
          });
          let items = listRes.data?.data || [];
          if (chartDistrict) items = items.filter((g) => Number(g.district_id) === Number(chartDistrict));
          if (chartType) items = items.filter((g) => Number(g.grievance_type_id) === Number(chartType));

          const monthMap = {};
          const now = new Date();
          let thisMonthCount = 0;
          for (const item of items) {
            if (!item.created_at) continue;
            const d = new Date(item.created_at);
            if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
              thisMonthCount += 1;
            }
            const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthMap[key] = (monthMap[key] || 0) + 1;
          }
          if (!monthly_slices.length) {
            monthly_slices = Object.entries(monthMap).map(([name, value]) => ({ name, value }));
          }
          if (!this_month) {
            this_month = thisMonthCount;
          }

          if (!timeline_slices.length) {
            let d_0_10 = 0;
            let d_11_15 = 0;
            let d_above_15 = 0;
            for (const item of items) {
              if (!item.created_at) continue;
              const days = Math.floor((now.getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
              if (days <= 10) d_0_10 += 1;
              else if (days <= 15) d_11_15 += 1;
              else d_above_15 += 1;
            }
            timeline_slices = [
              { name: '0 - 10 Days', value: d_0_10 },
              { name: '11 - 15 Days', value: d_11_15 },
              { name: '> 15 Days', value: d_above_15 },
            ];
          }

          if (!repeat_slices.length) {
            const mobileMap = {};
            for (const item of items) {
              const m = (item.citizen_mobile || '').trim();
              if (!m) continue;
              if (!mobileMap[m]) {
                mobileMap[m] = { mobile: m, name: item.citizen_name || 'Citizen', value: 0 };
              }
              mobileMap[m].value += 1;
            }
            repeat_slices = Object.values(mobileMap)
              .filter((x) => x.value > 1)
              .sort((a, b) => b.value - a.value)
              .map((x) => ({
                name: `${x.mobile} (${x.name})`,
                mobile: x.mobile,
                citizen_name: x.name,
                value: x.value,
              }));
          }
        } catch {
          // ignore
        }
      }

      setStats({
        ...dash,
        this_month: this_month || dash.this_month || 0,
        repeat_count: repeat_slices.length,
        status_slices,
        division_slices,
        monthly_slices,
        timeline_slices,
        repeat_slices,
      });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    }
  };

  useEffect(() => {
    api.get('/masters/districts').then((r) => setDistricts(r.data.data));
    api.get('/masters/grievance-types').then((r) => setTypes(r.data.data));
  }, []);

  useEffect(() => {
    loadChart();
  }, [chartDistrict, chartType, chartStatus]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={2}>
        <Box>
          <Typography variant="h5" gutterBottom>Main dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            {canRegister
              ? 'Analytics for grievances you registered.'
              : 'Visual analytics across status, division allocation, monthly registrations, aging timelines, and repeat phone numbers.'}
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="contained" onClick={() => navigate('/staff/grievances')}>
            {canRegister ? 'View your grievances →' : 'View all grievances →'}
          </Button>
          {canRegister && (
            <Button variant="outlined" onClick={() => navigate('/staff/register')}>
              Register grievance
            </Button>
          )}
        </Stack>
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>Effective grievance redressal</Typography>
              <Typography variant="body2" color="text.secondary">
                Overview across status, division allocation, monthly registrations, aging timelines, and repeat complainants.
              </Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Chip label={`Total: ${stats.total}`} color="default" sx={{ fontWeight: 600 }} />
              <Chip label={`Completed: ${stats.completed}`} color="success" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip label={`Pending: ${stats.pending}`} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip label={`This Month: ${stats.this_month || 0}`} color="info" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip label={`Overdue (>30d): ${stats.overdue}`} color="error" variant="outlined" sx={{ fontWeight: 600 }} />
              <Chip label={`Repeat Mobiles: ${stats.repeat_slices?.length || 0}`} color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
            </Stack>
          </Stack>

          {/* Filters Bar */}
          <Stack direction="row" gap={1.5} flexWrap="wrap" mb={3} alignItems="center">
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              Filter charts by:
            </Typography>
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
            {(chartDistrict || chartType || chartStatus) && (
              <Button
                size="small"
                variant="text"
                color="secondary"
                onClick={() => {
                  setChartDistrict('');
                  setChartType('');
                  setChartStatus('');
                }}
              >
                Reset filters
              </Button>
            )}
          </Stack>

          {/* 5 Pie Charts Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
            }}
          >
            {/* Chart 1: Status (Completed vs Pending) */}
            <PieCard
              title="1. Status Breakdown"
              subtitle="Completed vs Pending grievances"
              data={stats.status_slices}
              getColor={getStatusColor}
            />

            {/* Chart 2: Divisions (Bar Graph) */}
            <BarCard
              title="2. Grievances by Division"
              subtitle="Distribution across KSBA administrative divisions"
              data={stats.division_slices}
              getColor={getDivisionColor}
              xAngle={-20}
            />

            {/* Chart 3: Monthly Registrations (Bar Graph) */}
            <BarCard
              title="3. Monthly Registrations"
              subtitle="Registration trend by month"
              badge={`This Month: ${stats.this_month || 0}`}
              data={stats.monthly_slices}
              getColor={getMonthlyColor}
              xAngle={-20}
            />

            {/* Chart 4: Timeline / Aging from registration date */}
            <PieCard
              title="4. Timeline / Aging"
              subtitle="Days elapsed from registration date (0–10d, 11–15d, >15d)"
              badge={stats.overdue > 0 ? `${stats.overdue} overdue` : undefined}
              data={stats.timeline_slices}
              getColor={getTimelineColor}
            />

            {/* Chart 5: Repeat Phone Numbers (>1 Grievances Only) */}
            <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
              <PieCard
                title="5. Repeat Phone Numbers (>1 Cases)"
                subtitle="Showing only citizens whose phone number has been registered multiple times (Click a slice to view their grievances)"
                badge={stats.repeat_slices?.length > 0 ? `${stats.repeat_slices.length} Repeat Numbers` : 'No Repeats'}
                data={stats.repeat_slices}
                getColor={getRepeatColor}
                emptyMessage="No phone numbers are currently registered multiple times with these filters."
                onSliceClick={(entry) => {
                  const m = entry.mobile || entry.name.split(' ')[0];
                  navigate(`/staff/grievances?q=${encodeURIComponent(m)}`);
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
