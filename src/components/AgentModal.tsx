'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tabs,
  Tab,
  Stack,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { Agent, AgentStatus } from '@/lib/types';
import { getColors } from '@/theme/theme';

interface AgentModalProps {
  agent?: Agent;
  onClose: () => void;
  workspaceId?: string;
  onAgentCreated?: (agentId: string) => void;
}

const EMOJI_OPTIONS = ['🤖', '🦞', '💻', '🔍', '✍️', '🎨', '📊', '🧠', '⚡', '🚀', '🎯', '🔧'];

export function AgentModal({ agent, onClose, workspaceId, onAgentCreated }: AgentModalProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const { addAgent, updateAgent } = useMissionControl();
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [modelsLoading, setModelsLoading] = useState(true);

  const [form, setForm] = useState({
    name: agent?.name || '',
    role: agent?.role || '',
    description: agent?.description || '',
    avatar_emoji: agent?.avatar_emoji || '🤖',
    status: agent?.status || 'standby' as AgentStatus,
    is_master: agent?.is_master || false,
    soul_md: agent?.soul_md || '',
    user_md: agent?.user_md || '',
    agents_md: agent?.agents_md || '',
    model: agent?.model || '',
  });

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch('/api/openclaw/models');
        if (res.ok) {
          const data = await res.json();
          setAvailableModels(data.availableModels || []);
          setDefaultModel(data.defaultModel || '');
          if (!agent?.model && data.defaultModel) {
            setForm(prev => ({ ...prev, model: data.defaultModel }));
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
      } finally {
        setModelsLoading(false);
      }
    };
    loadModels();
  }, [agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = agent ? `/api/agents/${agent.id}` : '/api/agents';
      const method = agent ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          workspace_id: workspaceId || agent?.workspace_id || 'default',
        }),
      });

      if (res.ok) {
        const savedAgent = await res.json();
        if (agent) {
          updateAgent(savedAgent);
        } else {
          addAgent(savedAgent);
          if (onAgentCreated) {
            onAgentCreated(savedAgent.id);
          }
        }
        onClose();
      }
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!agent || !confirm(`Delete ${agent.name}?`)) return;

    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: 'DELETE' });
      if (res.ok) {
        useMissionControl.setState((state) => ({
          agents: state.agents.filter((a) => a.id !== agent.id),
          selectedAgent: state.selectedAgent?.id === agent.id ? null : state.selectedAgent,
        }));
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const tabs = ['Info', 'SOUL.md', 'USER.md', 'AGENTS.md'];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">
          {agent ? `Edit ${agent.name}` : 'Create New Agent'}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        {tabs.map((tab, idx) => (
          <Tab key={tab} label={tab} value={idx} />
        ))}
      </Tabs>

      <form id="agent-form" onSubmit={handleSubmit}>
        <DialogContent sx={{ py: 3 }}>
          {activeTab === 0 && (
            <Stack spacing={3}>
              {/* Avatar Selection */}
              <Box>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Avatar
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Box
                      key={emoji}
                      onClick={() => setForm({ ...form, avatar_emoji: emoji })}
                      sx={{
                        fontSize: '1.5rem',
                        p: 1,
                        borderRadius: 2,
                        cursor: 'pointer',
                        border: 2,
                        borderColor: form.avatar_emoji === emoji ? 'primary.main' : 'transparent',
                        bgcolor: form.avatar_emoji === emoji ? alpha(colors.accent, 0.12) : 'transparent',
                        '&:hover': { bgcolor: alpha(colors.accent, 0.08) },
                      }}
                    >
                      {emoji}
                    </Box>
                  ))}
                </Stack>
              </Box>

              <TextField
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                fullWidth
                placeholder="Agent name"
              />

              <TextField
                label="Role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                required
                fullWidth
                placeholder="e.g., Code & Automation"
              />

              <TextField
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                multiline
                rows={2}
                fullWidth
                placeholder="What does this agent do?"
              />

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e) => setForm({ ...form, status: e.target.value as AgentStatus })}
                >
                  <MenuItem value="standby">Standby</MenuItem>
                  <MenuItem value="working">Working</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.is_master}
                    onChange={(e) => setForm({ ...form, is_master: e.target.checked })}
                  />
                }
                label="Master Orchestrator (can coordinate other agents)"
              />

              <FormControl fullWidth>
                <InputLabel>Model</InputLabel>
                <Select
                  value={form.model}
                  label="Model"
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  disabled={modelsLoading}
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model} value={model}>
                      {model} {model === defaultModel && '(default)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          )}

          {activeTab === 1 && (
            <TextField
              label="SOUL.md"
              value={form.soul_md}
              onChange={(e) => setForm({ ...form, soul_md: e.target.value })}
              multiline
              rows={15}
              fullWidth
              placeholder="Define the agent's personality, capabilities, and behavior..."
              sx={{ fontFamily: 'monospace' }}
            />
          )}

          {activeTab === 2 && (
            <TextField
              label="USER.md"
              value={form.user_md}
              onChange={(e) => setForm({ ...form, user_md: e.target.value })}
              multiline
              rows={15}
              fullWidth
              placeholder="Define user-specific context and preferences..."
              sx={{ fontFamily: 'monospace' }}
            />
          )}

          {activeTab === 3 && (
            <TextField
              label="AGENTS.md"
              value={form.agents_md}
              onChange={(e) => setForm({ ...form, agents_md: e.target.value })}
              multiline
              rows={15}
              fullWidth
              placeholder="Define how this agent interacts with other agents..."
              sx={{ fontFamily: 'monospace' }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ flex: 1 }}>
            {agent && (
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </Box>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!form.name.trim() || !form.role.trim() || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : agent ? 'Save Changes' : 'Create Agent'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
