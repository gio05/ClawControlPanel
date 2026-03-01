'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, Stack, CircularProgress, alpha, useTheme } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import type { TaskActivity } from '@/lib/types';
import { getColors } from '@/theme/theme';

interface ActivityLogProps {
  taskId: string;
}

export function ActivityLog({ taskId }: ActivityLogProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastCountRef = useRef(0);

  const loadActivities = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      const res = await fetch(`/api/tasks/${taskId}/activities`);
      const data = await res.json();

      if (res.ok) {
        setActivities(data);
        lastCountRef.current = data.length;
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadActivities(true);
  }, [taskId, loadActivities]);

  const pollForActivities = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/activities`);
      if (res.ok) {
        const data = await res.json();
        if (data.length !== lastCountRef.current) {
          setActivities(data);
          lastCountRef.current = data.length;
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [taskId]);

  useEffect(() => {
    const pollInterval = setInterval(pollForActivities, 5000);
    pollingRef.current = pollInterval;

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [taskId, pollForActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'spawned':
        return '🚀';
      case 'updated':
        return '✏️';
      case 'completed':
        return '✅';
      case 'file_created':
        return '📄';
      case 'status_changed':
        return '🔄';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          Loading activities...
        </Typography>
      </Box>
    );
  }

  if (activities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>📝</Typography>
        <Typography color="text.secondary">No activity yet</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {activities.map((activity) => (
        <Box
          key={activity.id}
          sx={{
            display: 'flex',
            gap: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2.5,
            border: 1,
            borderColor: 'divider',
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              borderColor: alpha(colors.accent, 0.2),
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(colors.accent, 0.08),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ fontSize: '1rem' }}>{getActivityIcon(activity.activity_type)}</Typography>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {activity.agent && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.875rem' }}>{activity.agent.avatar_emoji}</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {activity.agent.name}
                </Typography>
              </Stack>
            )}

            <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.5 }}>
              {activity.message}
            </Typography>

            {activity.metadata && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  bgcolor: colors.bgTertiary,
                  borderRadius: 2,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  whiteSpace: 'pre-wrap',
                  border: 1,
                  borderColor: colors.border,
                }}
              >
                {typeof activity.metadata === 'string'
                  ? activity.metadata
                  : JSON.stringify(JSON.parse(activity.metadata), null, 2)}
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block', opacity: 0.8 }}>
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
