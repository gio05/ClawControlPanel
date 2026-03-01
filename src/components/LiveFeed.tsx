'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { Event } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { getColors } from '@/theme/theme';

type FeedFilter = 'all' | 'tasks' | 'agents';

export function LiveFeed() {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
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
        width: isMinimized ? 56 : 340,
        bgcolor: colors.bgSecondary,
        borderLeft: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease-in-out',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton 
            size="small" 
            onClick={() => setIsMinimized(!isMinimized)}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: colors.accent },
            }}
          >
            {isMinimized ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
          {!isMinimized && (
            <Typography 
              variant="body2" 
              fontWeight={600} 
              sx={{ 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                color: 'text.secondary',
              }}
            >
              Live Feed
            </Typography>
          )}
        </Stack>

        {!isMinimized && (
          <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
            {(['all', 'tasks', 'agents'] as FeedFilter[]).map((tab) => (
              <Chip
                key={tab}
                label={tab.charAt(0).toUpperCase() + tab.slice(1)}
                size="small"
                onClick={() => setFilter(tab)}
                sx={{
                  bgcolor: filter === tab ? colors.accent : 'transparent',
                  color: filter === tab ? '#ffffff' : 'text.secondary',
                  fontWeight: 500,
                  '&:hover': { 
                    bgcolor: filter === tab ? colors.accent : alpha(colors.accent, 0.08),
                  },
                }}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Events List */}
      {!isMinimized && (
        <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
          {filteredEvents.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary">
                No events yet
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
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
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  
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
        p: 1.5,
        borderRadius: 2,
        borderLeft: 3,
        borderColor: isHighlight ? colors.accent : 'transparent',
        bgcolor: isHighlight ? alpha(colors.accent, 0.06) : 'background.paper',
        border: isHighlight ? undefined : 1,
        borderTopColor: isHighlight ? undefined : 'divider',
        borderRightColor: isHighlight ? undefined : 'divider',
        borderBottomColor: isHighlight ? undefined : 'divider',
        transition: 'all 0.15s ease-in-out',
        '&:hover': { 
          bgcolor: alpha(colors.accent, 0.04),
          borderColor: alpha(colors.accent, 0.2),
        },
        animation: 'slideIn 0.3s ease-out',
        '@keyframes slideIn': {
          from: { opacity: 0, transform: 'translateX(10px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            bgcolor: alpha(colors.accent, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: '0.875rem' }}>{getEventIcon(event.type)}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              color: isTaskEvent ? colors.accent : 'text.primary',
              wordBreak: 'break-word',
              fontWeight: isHighlight ? 500 : 400,
              lineHeight: 1.5,
            }}
          >
            {event.message}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.75 }}>
            <ClockIcon sx={{ fontSize: 11, color: 'text.secondary', opacity: 0.7 }} />
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
