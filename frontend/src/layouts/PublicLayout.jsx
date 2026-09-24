import React from 'react';
import { Box, Button, Container, Toolbar } from '@mui/material';
import { Link as RouterLink, Outlet } from 'react-router-dom';
import { BrandLockup } from '../components/BrandLogos';
import { useBranding } from '../context/BrandingContext';

export default function PublicLayout() {
  const { boardLogoUrl, stateEmblemUrl } = useBranding();

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column">
      <Box sx={{ bgcolor: '#8b1e1e', color: '#fff', py: 0.5, fontSize: 12, textAlign: 'center' }}>
        Government of Karnataka | ಕರ್ನಾಟಕ ಸರ್ಕಾರ
      </Box>
      <Box sx={{ bgcolor: '#fff', py: { xs: 1.2, sm: 1.6 }, px: 2, borderBottom: '1px solid #e6e6e6' }}>
        <BrandLockup
          boardLogoUrl={boardLogoUrl}
          stateEmblemUrl={stateEmblemUrl}
          subtitle="KARNATAKA STATE BOARD OF AUQAF"
          title="WAQF Board Public Grievance Redressal Portal"
          kannada="ಸಾರ್ವಜನಿಕ ದೂರು ನಿವಾರಣಾ ಪೋರ್ಟಲ್"
          height={72}
        />
      </Box>
      <Box sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button color="inherit" component={RouterLink} to="/" sx={{ color: '#fff' }}>Home</Button>
          <Button color="inherit" component={RouterLink} to="/track" sx={{ color: '#fff' }}>Track / ಟ್ರ್ಯಾಕ್</Button>
          <Button color="inherit" component={RouterLink} to="/staff/login" sx={{ color: '#fff' }}>Official login</Button>
        </Toolbar>
      </Box>
      <Box sx={{ height: 6, background: 'linear-gradient(90deg,#c9a227,#0d5c3d,#8b1e1e)' }} />
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        <Outlet />
      </Container>
      <Box sx={{ bgcolor: 'primary.dark', color: '#dce8e1', py: 2, textAlign: 'center', fontSize: 13 }}>
        Darul Auqaf, No.6, Cunningham Road, Bengaluru-560052 · karwakf@karnataka.gov.in
      </Box>
    </Box>
  );
}
