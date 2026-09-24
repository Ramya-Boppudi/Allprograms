import React from 'react';
import {
  AppBar, Box, Button, Chip, Drawer, List, ListItemButton, ListItemText, Toolbar, Typography,
} from '@mui/material';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLockup } from '../components/BrandLogos';
import { useBranding } from '../context/BrandingContext';
import { canRegisterGrievance, ROLE_LABEL } from '../config/roles';

const drawerWidth = 250;

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const { boardLogoUrl, stateEmblemUrl } = useBranding();
  const navigate = useNavigate();

  const items = [
    { to: '/staff/dashboard', label: 'Dashboard' },
    { to: '/staff/grievances', label: 'Grievances' },
    ...(canRegisterGrievance(user?.role_code)
      ? [{ to: '/staff/register', label: 'Register grievance' }]
      : []),
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: 'primary.dark' }}>
        <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
          <BrandLockup
            boardLogoUrl={boardLogoUrl}
            stateEmblemUrl={stateEmblemUrl}
            subtitle="Karnataka State Board of Auqaf — Official console"
            title="WAQF Board Public Grievance Redressal Portal"
            height={44}
            framed
            dark
          />
          <Box display="flex" alignItems="center" flexShrink={0}>
            <Chip
              size="small"
              label={ROLE_LABEL[user?.role_code] || user?.role_code}
              sx={{ bgcolor: '#c9a227', mr: 2, fontWeight: 700 }}
            />
            <Button color="inherit" onClick={() => { logout(); navigate('/staff/login'); }}>Logout</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          <Box px={2} pb={2}>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
            {user?.division_name && (
              <Typography variant="caption" display="block" color="primary">{user.division_name}</Typography>
            )}
          </Box>
          {items.map((item) => (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              sx={{ '&.active': { bgcolor: '#dceee4', color: 'primary.dark', fontWeight: 700 } }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
