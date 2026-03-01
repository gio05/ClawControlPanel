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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Bolt as BoltIcon,
  BoltOutlined as BoltOffIcon,
  Search as SearchIcon,
  SmartToy as AgentsIcon,
  RssFeed as FeedIcon,
  AccessTime as ClockIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { Agent, AgentStatus, OpenClawSession, Event } from '@/lib/types';
import { AgentModal } from './AgentModal';
import { DiscoverAgentsModal } from './DiscoverAgentsModal';
import { getColors } from '@/theme/theme';
import { formatDistanceToNow } from 'date-fns';

type SidebarTab = 'agents' | 'feed';
type FilterTab = 'all' | 'working' | 'standby';
type FeedFilter = 'all' | 'tasks' | 'agents';

interface WorkspaceSidebarProps {
  workspaceId?: string;
}

export function WorkspaceSidebar({ workspaceId }: WorkspaceSidebarProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [activeTab, setActiveTab] = useState<SidebarTab>('agents');
  const { sidebarCollapsed, setSidebarCollapsed } = useMissionControl();

  const collapsedWidth = 56;
  const expandedWidth = 320;

  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: sidebarCollapsed ? collapsedWidth : expandedWidth,
        height: '100vh',
        bgcolor: colors.bgSecondary,
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1200,
        transition: 'width 0.2s ease-in-out',
      }}
    >
      {/* Collapse Toggle Button */}
      <Box 
        sx={{ 
          p: 1.5, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 56,
        }}
      >
        {!sidebarCollapsed && (
          <Typography 
            variant="body2" 
            fontWeight={700} 
            sx={{ 
              color: colors.accent,
              letterSpacing: '-0.01em',
            }}
          >
            🦞 ClawControl
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          sx={{
            color: 'text.secondary',
            '&:hover': { color: colors.accent, bgcolor: alpha(colors.accent, 0.08) },
          }}
        >
          {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      {/* Tab Navigation */}
      {!sidebarCollapsed ? (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                color: 'text.secondary',
                '&.Mui-selected': {
                  color: colors.accent,
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: colors.accent,
              },
            }}
          >
            <Tab 
              value="agents" 
              label="Agents" 
              icon={<AgentsIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              value="feed" 
              label="Live Feed" 
              icon={<FeedIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Box>
      ) : (
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Stack spacing={0.5} sx={{ p: 1 }}>
            <Tooltip title="Agents" placement="right">
              <IconButton
                onClick={() => { setActiveTab('agents'); setSidebarCollapsed(false); }}
                sx={{
                  color: activeTab === 'agents' ? colors.accent : 'text.secondary',
                  bgcolor: activeTab === 'agents' ? alpha(colors.accent, 0.1) : 'transparent',
                  '&:hover': { bgcolor: alpha(colors.accent, 0.08) },
                }}
              >
                <AgentsIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Live Feed" placement="right">
              <IconButton
                onClick={() => { setActiveTab('feed'); setSidebarCollapsed(false); }}
                sx={{
                  color: activeTab === 'feed' ? colors.accent : 'text.secondary',
                  bgcolor: activeTab === 'feed' ? alpha(colors.accent, 0.1) : 'transparent',
                  '&:hover': { bgcolor: alpha(colors.accent, 0.08) },
                }}
              >
                <FeedIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!sidebarCollapsed && (
          activeTab === 'agents' ? (
            <AgentsPanel workspaceId={workspaceId} colors={colors} />
          ) : (
            <LiveFeedPanel colors={colors} />
          )
        )}
      </Box>
    </Box>
  );
}

// ============ AGENTS PANEL ============

interface AgentsPanelProps {
  workspaceId?: string;
  colors: ReturnType<typeof getColors>;
}

function AgentsPanel({ workspaceId, colors }: AgentsPanelProps) {
  const { agents, selectedAgent, setSelectedAgent, agentOpenClawSessions, setAgentOpenClawSession } = useMissionControl();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [connectingAgentId, setConnectingAgentId] = useState<string | null>(null);
  const [activeSubAgents, setActiveSubAgents] = useState(0);

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
    <>
      {/* Filter & Stats */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
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
        </Stack>

        {activeSubAgents > 0 && (
          <Alert
            severity="success"
            sx={{
              mb: 2,
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

        <Stack direction="row" spacing={0.75}>
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
      </Box>

      {/* Agent List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {filteredAgents.map((agent) => {
          const openclawSession = agentOpenClawSessions[agent.id];
          const isConnecting = connectingAgentId === agent.id;

          return (
            <Box
              key={agent.id}
              sx={{
                borderRadius: 2,
                mb: 1,
                bgcolor: selectedAgent?.id === agent.id ? alpha(colors.accent, 0.08) : 'background.paper',
                border: 1,
                borderColor: selectedAgent?.id === agent.id ? alpha(colors.accent, 0.3) : 'divider',
                overflow: 'hidden',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  borderColor: alpha(colors.accent, 0.3),
                  bgcolor: alpha(colors.accent, 0.04),
                },
              }}
            >
              <Box
                onClick={() => {
                  setSelectedAgent(agent);
                  setEditingAgent(agent);
                }}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ position: 'relative' }}>
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
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {agent.name}
                      </Typography>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: getStatusColor(agent.status),
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {agent.role}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {selectedAgent?.id === agent.id && (
                <Box sx={{ px: 1.5, pb: 1.5 }}>
                  <Button
                    size="small"
                    fullWidth
                    onClick={(e) => handleConnectToOpenClaw(agent, e)}
                    disabled={isConnecting}
                    startIcon={
                      isConnecting ? (
                        <CircularProgress size={14} color="inherit" />
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
    </>
  );
}

// ============ LIVE FEED PANEL ============

interface LiveFeedPanelProps {
  colors: ReturnType<typeof getColors>;
}

function LiveFeedPanel({ colors }: LiveFeedPanelProps) {
  const { events } = useMissionControl();
  const [filter, setFilter] = useState<FeedFilter>('all');

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

  return (
    <>
      {/* Filter */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={0.75}>
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
      </Box>

      {/* Events List */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {filteredEvents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h3" sx={{ mb: 1, opacity: 0.5 }}>📡</Typography>
            <Typography variant="body2" color="text.secondary">
              No events yet
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1}>
            {filteredEvents.map((event) => (
              <EventItem key={event.id} event={event} colors={colors} />
            ))}
          </Stack>
        )}
      </Box>
    </>
  );
}

// ============ EVENT ITEM ============

interface EventItemProps {
  event: Event;
  colors: ReturnType<typeof getColors>;
}

function EventItem({ event, colors }: EventItemProps) {
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
