'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Tooltip,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Bolt as BoltIcon,
  BoltOutlined as BoltOffIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { Agent, AgentStatus, OpenClawSession } from '@/lib/types';
import { AgentModal } from './AgentModal';
import { DiscoverAgentsModal } from './DiscoverAgentsModal';
import { getColors } from '@/theme/theme';

type FilterTab = 'all' | 'working' | 'standby';

interface AgentsSidebarProps {
  workspaceId?: string;
}

export function AgentsSidebar({ workspaceId }: AgentsSidebarProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const { agents, selectedAgent, setSelectedAgent, agentOpenClawSessions, setAgentOpenClawSession } = useMissionControl();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [connectingAgentId, setConnectingAgentId] = useState<string | null>(null);
  const [activeSubAgents, setActiveSubAgents] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const loadOpenClawSessions = useCallback(async () => {
    for (const agent of agents) {
      try {
        const res = await fetch(`/api/agents/${agent.id}/openclaw`);
        if (res.ok) {
          const data = await res.json();
          if (data.linked && data.session) {
            setAgentOpenClawSession(agent.id, data.session as OpenClawSession);
          }
        }
      } catch (error) {
        console.error(`Failed to load OpenClaw session for ${agent.name}:`, error);
      }
    }
  }, [agents, setAgentOpenClawSession]);

  useEffect(() => {
    if (agents.length > 0) {
      loadOpenClawSessions();
    }
  }, [loadOpenClawSessions, agents.length]);

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

  const handleConnectToOpenClaw = async (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    setConnectingAgentId(agent.id);

    try {
      const existingSession = agentOpenClawSessions[agent.id];

      if (existingSession) {
        const res = await fetch(`/api/agents/${agent.id}/openclaw`, { method: 'DELETE' });
        if (res.ok) {
          setAgentOpenClawSession(agent.id, null);
        }
      } else {
        const res = await fetch(`/api/agents/${agent.id}/openclaw`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setAgentOpenClawSession(agent.id, data.session as OpenClawSession);
        } else {
          const error = await res.json();
          console.error('Failed to connect to OpenClaw:', error);
          alert(`Failed to connect: ${error.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('OpenClaw connection error:', error);
    } finally {
      setConnectingAgentId(null);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    if (filter === 'all') return true;
    return agent.status === filter;
  });

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'working':
        return colors.accentGreen;
      case 'standby':
        return colors.textSecondary;
      default:
        return colors.accentRed;
    }
  };

  return (
    <Box
      component="aside"
      sx={{
        width: isMinimized ? 56 : 280,
        bgcolor: colors.bgSecondary,
        borderRight: 1,
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
            {isMinimized ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
          {!isMinimized && (
            <>
              <Typography 
                variant="body2" 
                fontWeight={600} 
                sx={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  color: 'text.secondary',
                }}
              >
                Agents
              </Typography>
              <Chip 
                label={agents.length} 
                size="small" 
                sx={{ 
                  bgcolor: alpha(colors.accent, 0.1), 
                  color: colors.accent,
                  fontWeight: 600,
                  height: 22,
                }} 
              />
            </>
          )}
        </Stack>

        {!isMinimized && (
          <>
            {activeSubAgents > 0 && (
              <Alert
                severity="success"
                sx={{
                  mt: 2,
                  py: 0.75,
                  bgcolor: colors.accentGreenBg,
                  border: 1,
                  borderColor: alpha(colors.accentGreen, 0.2),
                  borderRadius: 2,
                  '& .MuiAlert-icon': { color: colors.accentGreen },
                }}
              >
                <Typography variant="body2">
                  Active Sub-Agents: <strong>{activeSubAgents}</strong>
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
              {(['all', 'working', 'standby'] as FilterTab[]).map((tab) => (
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
          </>
        )}
      </Box>

      {/* Agent List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {filteredAgents.map((agent) => {
          const openclawSession = agentOpenClawSessions[agent.id];
          const isConnecting = connectingAgentId === agent.id;

          if (isMinimized) {
            return (
              <Box key={agent.id} sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                <Tooltip title={`${agent.name} - ${agent.role}`} placement="right">
                  <Box
                    onClick={() => {
                      setSelectedAgent(agent);
                      setEditingAgent(agent);
                    }}
                    sx={{ position: 'relative', cursor: 'pointer' }}
                  >
                    <Typography variant="h5">{agent.avatar_emoji}</Typography>
                    {openclawSession && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 10,
                          height: 10,
                          bgcolor: colors.accentGreen,
                          borderRadius: '50%',
                          border: 2,
                          borderColor: 'background.paper',
                        }}
                      />
                    )}
                    {!!agent.is_master && (
                      <Typography
                        sx={{
                          position: 'absolute',
                          top: -4,
                          right: -4,
                          fontSize: 10,
                          color: colors.accentYellow,
                        }}
                      >
                        ★
                      </Typography>
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: getStatusColor(agent.status),
                      }}
                    />
                  </Box>
                </Tooltip>
              </Box>
            );
          }

          return (
            <Box
              key={agent.id}
              sx={{
                borderRadius: 2,
                mb: 1,
                bgcolor: selectedAgent?.id === agent.id ? alpha(colors.accent, 0.08) : 'transparent',
                border: 1,
                borderColor: selectedAgent?.id === agent.id ? alpha(colors.accent, 0.2) : 'transparent',
                transition: 'all 0.15s ease-in-out',
                '&:hover': { 
                  bgcolor: alpha(colors.accent, 0.06),
                  borderColor: alpha(colors.accent, 0.1),
                },
              }}
            >
              <Box
                onClick={() => {
                  setSelectedAgent(agent);
                  setEditingAgent(agent);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  cursor: 'pointer',
                }}
              >
                <Box sx={{ position: 'relative', fontSize: '1.5rem' }}>
                  {agent.avatar_emoji}
                  {openclawSession && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -4,
                        right: -4,
                        width: 12,
                        height: 12,
                        bgcolor: colors.accentGreen,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: colors.bgSecondary,
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {agent.name}
                    </Typography>
                    {!!agent.is_master && (
                      <Typography sx={{ fontSize: 10, color: colors.accentYellow }}>★</Typography>
                    )}
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {agent.role}
                    </Typography>
                    {agent.source === 'gateway' && (
                      <Chip
                        label="GW"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 9,
                          fontWeight: 600,
                          bgcolor: alpha(colors.accent, 0.1),
                          color: colors.accent,
                        }}
                      />
                    )}
                  </Stack>
                </Box>

                <Chip
                  label={agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: 11,
                    fontWeight: 500,
                    bgcolor: alpha(getStatusColor(agent.status), 0.1),
                    color: getStatusColor(agent.status),
                    border: 1,
                    borderColor: alpha(getStatusColor(agent.status), 0.2),
                  }}
                />
              </Box>

              {!!agent.is_master && (
                <Box sx={{ px: 1.5, pb: 1.5 }}>
                  <Button
                    fullWidth
                    size="small"
                    onClick={(e) => handleConnectToOpenClaw(agent, e)}
                    disabled={isConnecting}
                    startIcon={
                      isConnecting ? (
                        <CircularProgress size={12} />
                      ) : openclawSession ? (
                        <BoltIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <BoltOffIcon sx={{ fontSize: 14 }} />
                      )
                    }
                    sx={{
                      bgcolor: openclawSession ? colors.accentGreenBg : 'transparent',
                      color: openclawSession ? colors.accentGreen : 'text.secondary',
                      border: 1,
                      borderColor: openclawSession ? alpha(colors.accentGreen, 0.3) : colors.border,
                      '&:hover': {
                        bgcolor: openclawSession ? alpha(colors.accentGreen, 0.15) : alpha(colors.accent, 0.05),
                      },
                    }}
                  >
                    {isConnecting
                      ? 'Connecting...'
                      : openclawSession
                      ? 'OpenClaw Connected'
                      : 'Connect to OpenClaw'}
                  </Button>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Add Agent Buttons */}
      {!isMinimized && (
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1.5}>
            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => setShowCreateModal(true)}
              sx={{
                bgcolor: 'transparent',
                color: 'text.secondary',
                border: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                '&:hover': { 
                  bgcolor: alpha(colors.accent, 0.05),
                  borderColor: colors.accent,
                  color: colors.accent,
                },
              }}
            >
              Add Agent
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={() => setShowDiscoverModal(true)}
              sx={{
                bgcolor: colors.accent,
                color: '#ffffff',
                '&:hover': { bgcolor: colors.accentHover },
              }}
            >
              Import from Gateway
            </Button>
          </Stack>
        </Box>
      )}

      {/* Modals */}
      {showCreateModal && (
        <AgentModal onClose={() => setShowCreateModal(false)} workspaceId={workspaceId} />
      )}
      {editingAgent && (
        <AgentModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
          workspaceId={workspaceId}
        />
      )}
      {showDiscoverModal && (
        <DiscoverAgentsModal
          onClose={() => setShowDiscoverModal(false)}
          workspaceId={workspaceId}
        />
      )}
    </Box>
  );
}
