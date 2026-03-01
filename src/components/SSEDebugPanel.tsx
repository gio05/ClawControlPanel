'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Collapse,
  Paper,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ChevronDownIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { mcColors } from '@/theme/theme';

interface SSELogEntry {
  timestamp: Date;
  type: string;
  data: unknown;
}

function formatLogData(data: unknown): string {
  if (data === null || data === undefined) return '';
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  return String(data);
}

export function SSEDebugPanel() {
  const [logs, setLogs] = useState<SSELogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const addLog = useCallback((type: string, data: unknown) => {
    setLogs(prev => [{
      timestamp: new Date(),
      type,
      data
    }, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    const debugEnabled = localStorage.getItem('MC_DEBUG') === 'true';
    setIsEnabled(debugEnabled);

    if (!debugEnabled) return;

    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);

      if (typeof args[0] === 'string') {
        const msg = args[0] as string;
        if (msg.includes('[SSE]') || msg.includes('[STORE]') || msg.includes('[API]')) {
          const type = msg.replace(/^\[([^\]]+)\].*$/, '$1');
          const message = msg.replace(/^\[[^\]]+\]\s*/, '');
          addLog(`${type}: ${message}`, args[1]);
        }
      }
    };

    return () => {
      console.log = originalLog;
    };
  }, [addLog]);

  useEffect(() => {
    const handleStorage = () => {
      const debugEnabled = localStorage.getItem('MC_DEBUG') === 'true';
      setIsEnabled(debugEnabled);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (!isEnabled) return null;

  return (
    <Box sx={{ position: 'fixed', bottom: 16, left: 16, zIndex: 50 }}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        startIcon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          boxShadow: 4,
        }}
      >
        <Typography component="span" sx={{ color: 'primary.main', mr: 1 }}>Debug</Typography>
        <Chip label={logs.length} size="small" color="primary" />
      </Button>

      <Collapse in={isOpen}>
        <Paper
          sx={{
            position: 'absolute',
            bottom: 48,
            left: 0,
            width: 384,
            maxHeight: 320,
            overflow: 'hidden',
            boxShadow: 8,
          }}
        >
          <Box
            sx={{
              p: 1,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="body2" fontWeight="medium">Debug Events</Typography>
            <Button size="small" onClick={() => setLogs([])}>
              Clear
            </Button>
          </Box>
          <Box sx={{ overflow: 'auto', maxHeight: 256, p: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {logs.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Waiting for events...
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {logs.map((log, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1,
                      bgcolor: 'background.default',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                      <Typography variant="caption" sx={{ color: 'primary.main' }}>{log.type}</Typography>
                      <Typography variant="caption">{log.timestamp.toLocaleTimeString()}</Typography>
                    </Box>
                    {log.data !== null && log.data !== undefined && (
                      <Typography
                        component="pre"
                        sx={{
                          mt: 0.5,
                          color: 'text.primary',
                          overflow: 'auto',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.75rem',
                        }}
                      >
                        {formatLogData(log.data)}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}
