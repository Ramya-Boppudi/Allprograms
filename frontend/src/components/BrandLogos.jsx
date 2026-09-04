import React from 'react';
import { Box, Typography } from '@mui/material';

export function BrandLogo({ src, alt, height = 56, framed = false }) {
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      className="portal-logo"
      sx={{
        height,
        width: 'auto',
        maxWidth: height * 1.6,
        objectFit: 'contain',
        flexShrink: 0,
        ...(framed
          ? { bgcolor: '#fff', borderRadius: 1, p: 0.4 }
          : { bgcolor: 'transparent', p: 0 }),
      }}
    />
  );
}

export function BrandLockup({
  boardLogoUrl,
  stateEmblemUrl,
  title,
  subtitle,
  kannada,
  height = 72,
  framed = false,
  dark = false,
}) {
  const color = dark ? '#fff' : '#1b3a2a';
  const muted = dark ? 'rgba(255,255,255,0.88)' : '#4a4a4a';
  const accent = dark ? '#f6e27a' : '#0d5c3d';

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={{ xs: 1.5, sm: 2 }}
      flexWrap="wrap"
    >
      <BrandLogo src={stateEmblemUrl} alt="Government of Karnataka" height={height} framed={framed} />
      <Box textAlign="left" minWidth={0}>
        {subtitle && (
          <Typography
            variant="subtitle2"
            sx={{ color: muted, letterSpacing: 0.4, fontWeight: 700, lineHeight: 1.2 }}
          >
            {subtitle}
          </Typography>
        )}
        <Typography
          variant="h6"
          sx={{ color, lineHeight: 1.25, fontWeight: 800 }}
        >
          {title}
        </Typography>
        {kannada && (
          <Typography variant="body2" sx={{ color: accent, mt: 0.25 }}>
            {kannada}
          </Typography>
        )}
      </Box>
      <BrandLogo src={boardLogoUrl} alt="Karnataka State Board of Auqaf" height={height} framed={framed} />
    </Box>
  );
}
