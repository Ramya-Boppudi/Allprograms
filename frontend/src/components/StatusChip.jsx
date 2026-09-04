import React from 'react';
import { Chip } from '@mui/material';

const MAP = {
  CREATED: { label: 'Created', color: 'info' },
  PENDING: { label: 'Pending', color: 'warning' },
  COMPLETED: { label: 'Completed', color: 'success' },
};

export default function StatusChip({ status, publicStatus }) {
  const key = status || (publicStatus || '').toUpperCase();
  const cfg = MAP[key] || { label: publicStatus || status, color: 'default' };
  return <Chip size="small" color={cfg.color} label={cfg.label} />;
}
