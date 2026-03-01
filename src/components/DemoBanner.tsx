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
        background: 'linear-gradient(90deg, #2563eb, #9333ea, #2563eb)',
        color: 'white',
        textAlign: 'center',
        py: 1,
        px: 2,
        fontSize: '0.875rem',
        fontWeight: 500,
        position: 'relative',
        zIndex: 50,
      }}
    >
      <Typography component="span" sx={{ mr: 1 }}>🎮</Typography>
      <Typography component="span" variant="body2">
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
          '&:hover': { color: '#93c5fd' },
        }}
      >
        Get Mission Control →
      </MuiLink>
    </Box>
  );
}
