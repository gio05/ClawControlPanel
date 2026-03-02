'use client';

import { useState, useCallback } from 'react';
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
  Timeline as ActivityIcon,
  Inventory as PackageIcon,
  SmartToy as BotIcon,
  Assignment as ClipboardIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import { triggerAutoDispatch, shouldTriggerAutoDispatch } from '@/lib/auto-dispatch';
import { ActivityLog } from './ActivityLog';
import { DeliverablesList } from './DeliverablesList';
import { SessionsList } from './SessionsList';
import { PlanningTab } from './PlanningTab';
import { AgentModal } from './AgentModal';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { getColors } from '@/theme/theme';

type TabType = 'overview' | 'planning' | 'activity' | 'deliverables' | 'sessions';

interface TaskModalProps {
  task?: Task;
  onClose: () => void;
  workspaceId?: string;
}

export function TaskModal({ task, onClose, workspaceId }: TaskModalProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const { agents, addTask, updateTask, addEvent } = useMissionControl();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [usePlanningMode, setUsePlanningMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(task?.status === 'planning' ? 'planning' : 'overview');

  const handleSpecLocked = useCallback(() => {
    window.location.reload();
  }, []);

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'normal' as TaskPriority,
    status: task?.status || 'inbox' as TaskStatus,
    assigned_agent_id: task?.assigned_agent_id || '',
    due_date: task?.due_date || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PATCH' : 'POST';

      const payload = {
        ...form,
        status: (!task && usePlanningMode) ? 'planning' : form.status,
        assigned_agent_id: form.assigned_agent_id || null,
        due_date: form.due_date || null,
        workspace_id: workspaceId || task?.workspace_id || 'default',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedTask = await res.json();

        if (task) {
          updateTask(savedTask);

          // Check if we should auto-dispatch (status changed or agent assigned)
          if (shouldTriggerAutoDispatch(
            task.status, 
            savedTask.status, 
            savedTask.assigned_agent_id,
            task.assigned_agent_id  // Previous agent ID
          )) {
            const result = await triggerAutoDispatch({
              taskId: savedTask.id,
              taskTitle: savedTask.title,
              agentId: savedTask.assigned_agent_id,
              agentName: savedTask.assigned_agent?.name || 'Unknown Agent',
              workspaceId: savedTask.workspace_id
            });

            if (!result.success) {
              console.error('Auto-dispatch failed:', result.error);
            }
          }

          onClose();
        } else {
          addTask(savedTask);
          addEvent({
            id: crypto.randomUUID(),
            type: 'task_created',
            task_id: savedTask.id,
            message: `New task: ${savedTask.title}`,
            created_at: new Date().toISOString(),
          });

          if (usePlanningMode) {
            fetch(`/api/tasks/${savedTask.id}/planning`, { method: 'POST' })
              .then((res) => {
                if (res.ok) {
                  updateTask({ ...savedTask, status: 'planning' });
                  setActiveTab('planning');
                } else {
                  return res.json().then((data) => {
                    console.error('Failed to start planning:', data.error);
                  });
                }
              })
              .catch((error) => {
                console.error('Failed to start planning:', error);
              });
          }
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm(`Delete "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (res.ok) {
        useMissionControl.setState((state) => ({
          tasks: state.tasks.filter((t) => t.id !== task.id),
        }));
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const statuses: TaskStatus[] = ['planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'done'];
  const priorities: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { maxHeight: '90vh' } }}>
        {/* Header */}
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', py: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {task ? task.title : 'Create New Task'}
          </Typography>
          <IconButton 
            onClick={onClose} 
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': { color: colors.accent },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Tabs - only show for existing tasks */}
        {task && (
          <Tabs
            value={activeTab}
            onChange={(_, value) => setActiveTab(value)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}
          >
            <Tab value="overview" label="Overview" />
            <Tab value="planning" label="Planning" icon={<ClipboardIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab value="activity" label="Activity" icon={<ActivityIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab value="deliverables" label="Deliverables" icon={<PackageIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
            <Tab value="sessions" label="Sessions" icon={<BotIcon sx={{ fontSize: 16 }} />} iconPosition="start" />
          </Tabs>
        )}

        {/* Content */}
        <DialogContent sx={{ py: 3 }}>
          {activeTab === 'overview' && (
            <form id="task-form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  fullWidth
                  placeholder="What needs to be done?"
                />

                <TextField
                  label="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Add details..."
                />

                {!task && (
                  <Box
                    sx={{
                      p: 2.5,
                      bgcolor: alpha(colors.accent, 0.04),
                      borderRadius: 2.5,
                      border: 1,
                      borderColor: alpha(colors.accent, 0.1),
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={usePlanningMode}
                          onChange={(e) => setUsePlanningMode(e.target.checked)}
                          sx={{
                            color: colors.accent,
                            '&.Mui-checked': { color: colors.accent },
                          }}
                        />
                      }
                      label={
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <ClipboardIcon sx={{ fontSize: 16, color: colors.accent }} />
                            <Typography variant="body2" fontWeight={600}>
                              Enable Planning Mode
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}>
                            Best for complex projects that need detailed requirements. 
                            You&apos;ll answer a few questions to define scope, goals, and constraints 
                            before work begins. Skip this for quick, straightforward tasks.
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', m: 0 }}
                    />
                  </Box>
                )}

                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={form.status}
                      label="Status"
                      onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                    >
                      {statuses.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s.replace('_', ' ').toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={form.priority}
                      label="Priority"
                      onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                    >
                      {priorities.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p.toUpperCase()}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <FormControl fullWidth>
                  <InputLabel>Assign to</InputLabel>
                  <Select
                    value={form.assigned_agent_id}
                    label="Assign to"
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setShowAgentModal(true);
                      } else {
                        setForm({ ...form, assigned_agent_id: e.target.value });
                      }
                    }}
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {agents.map((agent) => (
                      <MenuItem key={agent.id} value={agent.id}>
                        {agent.avatar_emoji} {agent.name} - {agent.role}
                      </MenuItem>
                    ))}
                    <MenuItem value="__add_new__" sx={{ color: 'primary.main' }}>
                      <AddIcon sx={{ fontSize: 16, mr: 1 }} /> Add new agent...
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Due Date"
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </form>
          )}

          {activeTab === 'planning' && task && (
            <PlanningTab taskId={task.id} onSpecLocked={handleSpecLocked} />
          )}

          {activeTab === 'activity' && task && (
            <ActivityLog taskId={task.id} />
          )}

          {activeTab === 'deliverables' && task && (
            <DeliverablesList taskId={task.id} />
          )}

          {activeTab === 'sessions' && task && (
            <SessionsList taskId={task.id} />
          )}
        </DialogContent>

        {/* Footer - only show on overview tab */}
        {activeTab === 'overview' && (
          <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ flex: 1 }}>
              {task && (
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
              form="task-form"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={!form.title.trim() || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {showAgentModal && (
        <AgentModal
          onClose={() => setShowAgentModal(false)}
          workspaceId={workspaceId}
          onAgentCreated={(agentId: string) => {
            setForm({ ...form, assigned_agent_id: agentId });
            setShowAgentModal(false);
          }}
        />
      )}
    </>
  );
}
