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
  alpha,
  useTheme,
} from '@mui/material';
import {
  Bolt as BoltIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  GridView as LayoutGridIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import { format } from 'date-fns';
import type { Workspace } from '@/lib/types';
import { getColors } from '@/theme/theme';
import { useThemeMode } from '@/theme/ThemeContext';

interface HeaderProps {
  workspace?: Workspace;
}

export function Header({ workspace }: HeaderProps) {
  const router = useRouter();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
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
      <Toolbar sx={{ height: 64, minHeight: 64, px: 3 }}>
        {/* Left: Logo & Title */}
        <Stack direction="row" alignItems="center" spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 2,
                bgcolor: alpha(colors.accent, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BoltIcon sx={{ color: colors.accent, fontSize: 20 }} />
            </Box>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              Mission Control
            </Typography>
          </Stack>

          {workspace ? (
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                  <ChevronLeftIcon fontSize="small" />
                  <LayoutGridIcon fontSize="small" />
                </IconButton>
              </Link>
              <Typography color="text.secondary" sx={{ opacity: 0.5 }}>/</Typography>
              <Chip
                icon={<Typography sx={{ fontSize: '1rem' }}>{workspace.icon}</Typography>}
                label={workspace.name}
                sx={{
                  bgcolor: alpha(colors.accent, 0.08),
                  color: 'text.primary',
                  fontWeight: 500,
                  '& .MuiChip-icon': { ml: 0.5 },
                }}
              />
            </Stack>
          ) : (
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Chip
                icon={<LayoutGridIcon sx={{ fontSize: 16 }} />}
                label="All Workspaces"
                sx={{
                  bgcolor: colors.bgTertiary,
                  fontWeight: 500,
                  '&:hover': { bgcolor: alpha(colors.accent, 0.08) },
                }}
              />
            </Link>
          )}
        </Stack>

        <Box sx={{ flex: 1 }} />

        {/* Center: Stats */}
        {workspace && (
          <Stack direction="row" spacing={5} sx={{ mx: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                fontWeight="700" 
                sx={{ 
                  color: colors.accent,
                  letterSpacing: '-0.02em',
                }}
              >
                {activeAgents}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                }}
              >
                Agents Active
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography 
                variant="h4" 
                fontWeight="700" 
                sx={{ 
                  color: colors.accentPurple,
                  letterSpacing: '-0.02em',
                }}
              >
                {tasksInQueue}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                }}
              >
                Tasks in Queue
              </Typography>
            </Box>
          </Stack>
        )}

        {/* Right: Time & Status */}
        <Stack direction="row" alignItems="center" spacing={2.5}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontFamily: 'monospace',
              fontWeight: 500,
              opacity: 0.8,
            }}
          >
            {format(currentTime, 'HH:mm:ss')}
          </Typography>
          <Chip
            size="small"
            label={
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: isOnline ? colors.accentGreen : colors.accentRed,
                    animation: isOnline ? 'pulse 2s infinite' : 'none',
                  }}
                />
                <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: '0.03em' }}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Typography>
              </Stack>
            }
            sx={{
              bgcolor: isOnline ? colors.accentGreenBg : colors.accentRedBg,
              color: isOnline ? colors.accentGreen : colors.accentRed,
              border: 1,
              borderColor: alpha(isOnline ? colors.accentGreen : colors.accentRed, 0.2),
            }}
          />
          <IconButton
            onClick={toggleTheme}
            sx={{ 
              color: 'text.secondary',
              '&:hover': { color: colors.accent },
            }}
            title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
          <IconButton 
            onClick={() => router.push('/settings')} 
            sx={{ 
              color: 'text.secondary',
              '&:hover': { color: colors.accent },
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
