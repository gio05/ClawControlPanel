'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography, Stack, CircularProgress } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import type { TaskActivity } from '@/lib/types';
import { mcColors } from '@/theme/theme';

interface ActivityLogProps {
  taskId: string;
}

export function ActivityLog({ taskId }: ActivityLogProps) {
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
    <Stack spacing={1.5}>
      {activities.map((activity) => (
        <Box
          key={activity.id}
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1.5,
            bgcolor: 'background.default',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="h5">{getActivityIcon(activity.activity_type)}</Typography>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {activity.agent && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Typography variant="body2">{activity.agent.avatar_emoji}</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {activity.agent.name}
                </Typography>
              </Stack>
            )}

            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {activity.message}
            </Typography>

            {activity.metadata && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: mcColors.bgTertiary,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {typeof activity.metadata === 'string'
                  ? activity.metadata
                  : JSON.stringify(JSON.parse(activity.metadata), null, 2)}
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
