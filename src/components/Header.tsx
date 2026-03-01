'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  FlashOn as ZapIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  GridView as LayoutGridIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import { format } from 'date-fns';
import type { Workspace } from '@/lib/types';
import { mcColors } from '@/theme/theme';
import { useThemeMode } from '@/theme/ThemeContext';

interface HeaderProps {
  workspace?: Workspace;
}

export function Header({ workspace }: HeaderProps) {
  const router = useRouter();
  const { agents, tasks, isOnline } = useMissionControl();
  const { resolvedMode, toggleTheme } = useThemeMode();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeSubAgents, setActiveSubAgents] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSubAgentCount = async () => {
      try {
        const res = await fetch('/api/openclaw/sessions?session_type=subagent&status=active');
        if (res.ok) {
          const sessions = await res.json();
          setActiveSubAgents(sessions.length);
        }
      } catch (error) {
        console.error('Failed to load sub-agent count:', error);
      }
    };

    loadSubAgentCount();
    const interval = setInterval(loadSubAgentCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const workingAgents = agents.filter((a) => a.status === 'working').length;
  const activeAgents = workingAgents + activeSubAgents;
  const tasksInQueue = tasks.filter((t) => t.status !== 'done' && t.status !== 'review').length;

  return (
    <AppBar
      position="static"
      sx={{
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ height: 56, minHeight: 56 }}>
        {/* Left: Logo & Title */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ZapIcon sx={{ color: mcColors.accentCyan }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Mission Control
            </Typography>
          </Stack>

          {workspace ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <ChevronLeftIcon fontSize="small" />
                  <LayoutGridIcon fontSize="small" />
                </IconButton>
              </Link>
              <Typography color="text.secondary">/</Typography>
              <Chip
                icon={<Typography>{workspace.icon}</Typography>}
                label={workspace.name}
                sx={{
                  bgcolor: mcColors.bgTertiary,
                  '& .MuiChip-icon': { ml: 1 },
                }}
              />
            </Stack>
          ) : (
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Chip
                icon={<LayoutGridIcon sx={{ fontSize: 16 }} />}
                label="All Workspaces"
                sx={{
                  bgcolor: mcColors.bgTertiary,
                  '&:hover': { bgcolor: 'background.default' },
                }}
              />
            </Link>
          )}
        </Stack>

        <Box sx={{ flex: 1 }} />

        {/* Center: Stats */}
        {workspace && (
          <Stack direction="row" spacing={4} sx={{ mx: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: mcColors.accentCyan }}>
                {activeAgents}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                Agents Active
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: mcColors.accentPurple }}>
                {tasksInQueue}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                Tasks in Queue
              </Typography>
            </Box>
          </Stack>
        )}

        {/* Right: Time & Status */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {format(currentTime, 'HH:mm:ss')}
          </Typography>
          <Chip
            size="small"
            label={
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isOnline ? 'success.main' : 'error.main',
                    animation: isOnline ? 'pulse 2s infinite' : 'none',
                  }}
                />
                <Typography variant="caption" fontWeight="medium">
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Typography>
              </Stack>
            }
            sx={{
              bgcolor: isOnline ? `${mcColors.accentGreen}20` : `${mcColors.accentRed}20`,
              borderColor: isOnline ? mcColors.accentGreen : mcColors.accentRed,
              color: isOnline ? mcColors.accentGreen : mcColors.accentRed,
              border: 1,
            }}
          />
          <IconButton
            onClick={toggleTheme}
            sx={{ color: 'text.secondary' }}
            title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton onClick={() => router.push('/settings')} sx={{ color: 'text.secondary' }}>
            <SettingsIcon />
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
