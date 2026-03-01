'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { Event } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { mcColors } from '@/theme/theme';

type FeedFilter = 'all' | 'tasks' | 'agents';

export function LiveFeed() {
  const { events } = useMissionControl();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [isMinimized, setIsMinimized] = useState(false);

  const filteredEvents = events.filter((event) => {
    if (filter === 'all') return true;
    if (filter === 'tasks')
      return ['task_created', 'task_assigned', 'task_status_changed', 'task_completed'].includes(
        event.type
      );
    if (filter === 'agents')
      return ['agent_joined', 'agent_status_changed', 'message_sent'].includes(event.type);
    return true;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return '📋';
      case 'task_assigned':
        return '👤';
      case 'task_status_changed':
        return '🔄';
      case 'task_completed':
        return '✅';
      case 'message_sent':
        return '💬';
      case 'agent_joined':
        return '🎉';
      case 'agent_status_changed':
        return '🔔';
      case 'system':
        return '⚙️';
      default:
        return '📌';
    }
  };

  return (
    <Box
      component="aside"
      sx={{
        width: isMinimized ? 48 : 320,
        bgcolor: 'background.paper',
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease-in-out',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
          {!isMinimized && (
            <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Live Feed
            </Typography>
          )}
        </Stack>

        {!isMinimized && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
            {(['all', 'tasks', 'agents'] as FeedFilter[]).map((tab) => (
              <Chip
                key={tab}
                label={tab.toUpperCase()}
                size="small"
                onClick={() => setFilter(tab)}
                sx={{
                  bgcolor: filter === tab ? 'primary.main' : 'transparent',
                  color: filter === tab ? 'primary.contrastText' : 'text.secondary',
                  '&:hover': { bgcolor: filter === tab ? 'primary.main' : mcColors.bgTertiary },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Events List */}
      {!isMinimized && (
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          {filteredEvents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No events yet
              </Typography>
            </Box>
          ) : (
            <Stack spacing={0.5}>
              {filteredEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Box>
  );
}

function EventItem({ event }: { event: Event }) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task_created':
        return '📋';
      case 'task_assigned':
        return '👤';
      case 'task_status_changed':
        return '🔄';
      case 'task_completed':
        return '✅';
      case 'message_sent':
        return '💬';
      case 'agent_joined':
        return '🎉';
      case 'agent_status_changed':
        return '🔔';
      case 'system':
        return '⚙️';
      default:
        return '📌';
    }
  };

  const isTaskEvent = ['task_created', 'task_assigned', 'task_completed'].includes(event.type);
  const isHighlight = event.type === 'task_created' || event.type === 'task_completed';

  return (
    <Box
      sx={{
        p: 1,
        borderRadius: 1,
        borderLeft: 2,
        borderColor: isHighlight ? mcColors.accentPink : 'transparent',
        bgcolor: isHighlight ? mcColors.bgTertiary : 'transparent',
        '&:hover': { bgcolor: mcColors.bgTertiary },
        animation: 'slideIn 0.3s ease-out',
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateX(10px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Typography variant="body2">{getEventIcon(event.type)}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: isTaskEvent ? mcColors.accentPink : 'text.primary',
              wordBreak: 'break-word',
            }}
          >
            {event.message}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
            <ClockIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
