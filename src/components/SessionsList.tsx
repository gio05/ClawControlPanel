'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  alpha,
} from '@mui/material';
import {
  SmartToy as BotIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as CircleIcon,
  Cancel as XCircleIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  History as HistoryIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { getColors } from '@/theme/theme';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | { type: string; text?: string }[];
  name?: string;
  tool_call_id?: string;
}

interface SessionWithAgent {
  id: string;
  agent_id: string | null;
  openclaw_session_id: string;
  channel: string | null;
  status: string;
  session_type: string;
  task_id: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  agent_name?: string;
  agent_avatar_emoji?: string;
}

interface SessionsListProps {
  taskId: string;
}

export function SessionsList({ taskId }: SessionsListProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [sessions, setSessions] = useState<SessionWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionWithAgent | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/subagent`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const loadHistory = useCallback(async (sessionKey: string) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      const res = await fetch(`/api/openclaw/sessions/${encodeURIComponent(sessionKey)}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load session history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSessionClick = (session: SessionWithAgent) => {
    setSelectedSession(session);
    loadHistory(session.openclaw_session_id);
  };

  const handleCloseHistory = () => {
    setSelectedSession(null);
    setHistory([]);
  };

  const getMessageContent = (message: ChatMessage): string => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      return message.content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n');
    }
    return '';
  };

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CircleIcon sx={{ color: colors.accentGreen, animation: 'pulse 2s infinite' }} />;
      case 'completed':
        return <CheckCircleIcon sx={{ color: colors.accent }} />;
      case 'failed':
        return <XCircleIcon sx={{ color: colors.accentRed }} />;
      default:
        return <CircleIcon color="action" />;
    }
  };

  const formatDuration = (start: string, end?: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleMarkComplete = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/openclaw/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          ended_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('Failed to mark session complete:', error);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Delete this sub-agent session?')) return;
    try {
      const res = await fetch(`/api/openclaw/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadSessions();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          Loading sessions...
        </Typography>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>🤖</Typography>
        <Typography color="text.secondary">No sessions yet</Typography>
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={1.5}>
        {sessions.map((session) => (
          <Box
            key={session.id}
            onClick={() => handleSessionClick(session)}
            sx={{
              display: 'flex',
              gap: 1.5,
              p: 1.5,
              bgcolor: 'background.default',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              '&:hover': {
                borderColor: colors.accent,
                bgcolor: alpha(colors.accent, 0.04),
              },
            }}
          >
            <Box>
              {session.agent_avatar_emoji ? (
                <Typography variant="h4">{session.agent_avatar_emoji}</Typography>
              ) : (
                <BotIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                {getStatusIcon(session.status)}
                <Typography variant="body2" fontWeight="medium">
                  {session.agent_name || 'Agent Session'}
                </Typography>
                <Chip
                  label={session.session_type === 'subagent' ? 'Sub-Agent' : 'Primary'}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    textTransform: 'capitalize',
                    bgcolor: session.session_type === 'subagent' 
                      ? alpha(colors.accentPurple, 0.1)
                      : alpha(colors.accent, 0.1),
                    color: session.session_type === 'subagent' 
                      ? colors.accentPurple
                      : colors.accent,
                  }}
                />
                <Chip
                  label={session.status}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    textTransform: 'capitalize',
                  }}
                />
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', mb: 1 }}>
                Session: {session.openclaw_session_id}
              </Typography>

              <Stack direction="row" spacing={1.5}>
                <Typography variant="caption" color="text.secondary">
                  Duration: {formatDuration(session.created_at, session.ended_at)}
                </Typography>
                <Typography variant="caption" color="text.secondary">•</Typography>
                <Typography variant="caption" color="text.secondary">
                  Started {formatTimestamp(session.created_at)}
                </Typography>
              </Stack>

              {session.channel && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Channel: <span style={{ fontFamily: 'monospace' }}>{session.channel}</span>
                </Typography>
              )}
            </Box>

            <Stack spacing={0.5} onClick={(e) => e.stopPropagation()}>
              <IconButton
                size="small"
                onClick={() => handleSessionClick(session)}
                title="View conversation"
                sx={{ color: colors.accent }}
              >
                <HistoryIcon sx={{ fontSize: 16 }} />
              </IconButton>
              {session.status === 'active' && (
                <IconButton
                  size="small"
                  onClick={() => handleMarkComplete(session.openclaw_session_id)}
                  title="Mark as complete"
                  sx={{ color: colors.accentGreen }}
                >
                  <CheckIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => handleDelete(session.openclaw_session_id)}
                title="Delete session"
                sx={{ color: 'text.secondary', '&:hover': { color: colors.accentRed } }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          </Box>
        ))}
      </Stack>

      {/* Session History Dialog */}
      <Dialog
        open={!!selectedSession}
        onClose={handleCloseHistory}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            maxHeight: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {selectedSession?.agent_avatar_emoji ? (
              <Typography variant="h5">{selectedSession.agent_avatar_emoji}</Typography>
            ) : (
              <BotIcon sx={{ fontSize: 28 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {selectedSession?.agent_name || 'Session'} - Conversation History
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {selectedSession?.openclaw_session_id}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={handleCloseHistory} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary" sx={{ ml: 2 }}>
                Loading conversation...
              </Typography>
            </Box>
          ) : history.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h4" sx={{ mb: 1 }}>💬</Typography>
              <Typography color="text.secondary">No messages in this session</Typography>
            </Box>
          ) : (
            <Stack spacing={0}>
              {history.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'assistant' 
                      ? alpha(colors.accent, 0.04)
                      : message.role === 'user'
                      ? 'transparent'
                      : message.role === 'system'
                      ? alpha(colors.accentYellow, 0.04)
                      : alpha(colors.accentPurple, 0.04),
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: message.role === 'assistant'
                          ? alpha(colors.accent, 0.1)
                          : message.role === 'user'
                          ? alpha(colors.accentGreen, 0.1)
                          : message.role === 'system'
                          ? alpha(colors.accentYellow, 0.1)
                          : alpha(colors.accentPurple, 0.1),
                        flexShrink: 0,
                      }}
                    >
                      {message.role === 'assistant' ? (
                        <BotIcon sx={{ fontSize: 16, color: colors.accent }} />
                      ) : message.role === 'user' ? (
                        <PersonIcon sx={{ fontSize: 16, color: colors.accentGreen }} />
                      ) : message.role === 'system' ? (
                        <Typography sx={{ fontSize: 12 }}>⚙️</Typography>
                      ) : (
                        <Typography sx={{ fontSize: 12 }}>🔧</Typography>
                      )}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography 
                        variant="caption" 
                        fontWeight={600}
                        sx={{ 
                          color: message.role === 'assistant'
                            ? colors.accent
                            : message.role === 'user'
                            ? colors.accentGreen
                            : message.role === 'system'
                            ? colors.accentYellow
                            : colors.accentPurple,
                          textTransform: 'capitalize',
                          display: 'block',
                          mb: 0.5,
                        }}
                      >
                        {message.role}
                        {message.name && ` (${message.name})`}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: message.role === 'tool' ? 'monospace' : 'inherit',
                          fontSize: message.role === 'tool' ? '0.75rem' : '0.875rem',
                        }}
                      >
                        {getMessageContent(message)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
