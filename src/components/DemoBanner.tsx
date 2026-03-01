'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';

export default function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch('/api/demo')
      .then(r => r.json())
      .then(data => setIsDemo(data.demo))
      .catch(() => {});
  }, []);

  if (!isDemo) return null;

  return (
    <Box
      sx={{
        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
        color: 'white',
        textAlign: 'center',
        py: 0.75,
        px: 2,
        fontSize: '0.8125rem',
        fontWeight: 500,
        position: 'relative',
        zIndex: 50,
      }}
    >
      <Typography component="span" sx={{ mr: 1, fontSize: '0.875rem' }}>✨</Typography>
      <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
        Live Demo — AI agents are working in real-time. This is a read-only simulation.
      </Typography>
      <MuiLink
        href="https://github.com/crshdn/mission-control"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          ml: 1.5,
          color: 'inherit',
          textDecoration: 'underline',
          fontWeight: 600,
          '&:hover': { color: 'rgba(255,255,255,0.85)' },
        }}
      >
        Get Mission Control →
      </MuiLink>
    </Box>
  );
}
