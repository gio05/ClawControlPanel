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
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  FlashOn as ZapIcon,
  FlashOff as ZapOffIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { Agent, AgentStatus, OpenClawSession } from '@/lib/types';
import { AgentModal } from './AgentModal';
import { DiscoverAgentsModal } from './DiscoverAgentsModal';
import { mcColors } from '@/theme/theme';

type FilterTab = 'all' | 'working' | 'standby';

interface AgentsSidebarProps {
  workspaceId?: string;
}

export function AgentsSidebar({ workspaceId }: AgentsSidebarProps) {
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
        return mcColors.accentGreen;
      case 'standby':
        return mcColors.textSecondary;
      default:
        return mcColors.accentRed;
    }
  };

  return (
    <Box
      component="aside"
      sx={{
        width: isMinimized ? 48 : 256,
        bgcolor: 'background.paper',
        borderRight: 1,
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
            {isMinimized ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
          {!isMinimized && (
            <>
              <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agents
              </Typography>
              <Chip label={agents.length} size="small" sx={{ bgcolor: mcColors.bgTertiary, height: 20 }} />
            </>
          )}
        </Stack>

        {!isMinimized && (
          <>
            {activeSubAgents > 0 && (
              <Alert
                severity="success"
                sx={{
                  mt: 1.5,
                  py: 0.5,
                  bgcolor: `${mcColors.accentGreen}10`,
                  border: 1,
                  borderColor: `${mcColors.accentGreen}20`,
                }}
              >
                <Typography variant="body2">
                  Active Sub-Agents: <strong>{activeSubAgents}</strong>
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={0.5} sx={{ mt: 1.5 }}>
              {(['all', 'working', 'standby'] as FilterTab[]).map((tab) => (
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
                          bgcolor: mcColors.accentGreen,
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
                          color: mcColors.accentYellow,
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
                borderRadius: 1,
                mb: 0.5,
                bgcolor: selectedAgent?.id === agent.id ? mcColors.bgTertiary : 'transparent',
                '&:hover': { bgcolor: mcColors.bgTertiary },
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
                  p: 1,
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
                        bgcolor: mcColors.accentGreen,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: 'background.paper',
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" fontWeight="medium" noWrap>
                      {agent.name}
                    </Typography>
                    {!!agent.is_master && (
                      <Typography sx={{ fontSize: 10, color: mcColors.accentYellow }}>★</Typography>
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
                          bgcolor: `${mcColors.accent}20`,
                          color: mcColors.accent,
                        }}
                      />
                    )}
                  </Stack>
                </Box>

                <Chip
                  label={agent.status.toUpperCase()}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    bgcolor: `${getStatusColor(agent.status)}20`,
                    color: getStatusColor(agent.status),
                    border: 1,
                    borderColor: `${getStatusColor(agent.status)}50`,
                  }}
                />
              </Box>

              {!!agent.is_master && (
                <Box sx={{ px: 1, pb: 1 }}>
                  <Button
                    fullWidth
                    size="small"
                    onClick={(e) => handleConnectToOpenClaw(agent, e)}
                    disabled={isConnecting}
                    startIcon={
                      isConnecting ? (
                        <CircularProgress size={12} />
                      ) : openclawSession ? (
                        <ZapIcon sx={{ fontSize: 14 }} />
                      ) : (
                        <ZapOffIcon sx={{ fontSize: 14 }} />
                      )
                    }
                    sx={{
                      bgcolor: openclawSession ? `${mcColors.accentGreen}20` : mcColors.bg,
                      color: openclawSession ? mcColors.accentGreen : 'text.secondary',
                      '&:hover': {
                        bgcolor: openclawSession ? `${mcColors.accentGreen}30` : mcColors.bgTertiary,
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
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Button
              fullWidth
              startIcon={<AddIcon />}
              onClick={() => setShowCreateModal(true)}
              sx={{
                bgcolor: mcColors.bgTertiary,
                color: 'text.secondary',
                '&:hover': { bgcolor: 'divider', color: 'text.primary' },
              }}
            >
              Add Agent
            </Button>
            <Button
              fullWidth
              startIcon={<SearchIcon />}
              onClick={() => setShowDiscoverModal(true)}
              sx={{
                bgcolor: `${mcColors.accent}10`,
                color: mcColors.accent,
                border: 1,
                borderColor: `${mcColors.accent}20`,
                '&:hover': { bgcolor: `${mcColors.accent}20` },
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
