'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  DragIndicator as GripIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import { triggerAutoDispatch, shouldTriggerAutoDispatch } from '@/lib/auto-dispatch';
import type { Task, TaskStatus } from '@/lib/types';
import { TaskModal } from './TaskModal';
import { formatDistanceToNow } from 'date-fns';
import { mcColors } from '@/theme/theme';

interface MissionQueueProps {
  workspaceId?: string;
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'planning', label: '📋 PLANNING', color: mcColors.accentPurple },
  { id: 'inbox', label: 'INBOX', color: mcColors.accentPink },
  { id: 'assigned', label: 'ASSIGNED', color: mcColors.accentYellow },
  { id: 'in_progress', label: 'IN PROGRESS', color: mcColors.accent },
  { id: 'testing', label: 'TESTING', color: mcColors.accentCyan },
  { id: 'review', label: 'REVIEW', color: mcColors.accentPurple },
  { id: 'done', label: 'DONE', color: mcColors.accentGreen },
];

export function MissionQueue({ workspaceId }: MissionQueueProps) {
  const { tasks, updateTaskStatus, addEvent } = useMissionControl();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((task) => task.status === status);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === targetStatus) {
      setDraggedTask(null);
      return;
    }

    updateTaskStatus(draggedTask.id, targetStatus);

    try {
      const res = await fetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (res.ok) {
        addEvent({
          id: crypto.randomUUID(),
          type: targetStatus === 'done' ? 'task_completed' : 'task_status_changed',
          task_id: draggedTask.id,
          message: `Task "${draggedTask.title}" moved to ${targetStatus}`,
          created_at: new Date().toISOString(),
        });

        if (shouldTriggerAutoDispatch(draggedTask.status, targetStatus, draggedTask.assigned_agent_id)) {
          const result = await triggerAutoDispatch({
            taskId: draggedTask.id,
            taskTitle: draggedTask.title,
            agentId: draggedTask.assigned_agent_id,
            agentName: draggedTask.assigned_agent?.name || 'Unknown Agent',
            workspaceId: draggedTask.workspace_id
          });

          if (!result.success) {
            console.error('Auto-dispatch failed:', result.error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      updateTaskStatus(draggedTask.id, draggedTask.status);
    }

    setDraggedTask(null);
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
          <Typography variant="body2" fontWeight="medium" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mission Queue
          </Typography>
        </Stack>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          sx={{ bgcolor: mcColors.accentPink, '&:hover': { bgcolor: `${mcColors.accentPink}cc` } }}
        >
          New Task
        </Button>
      </Box>

      {/* Kanban Columns */}
      <Box sx={{ flex: 1, display: 'flex', gap: 1.5, p: 1.5, overflowX: 'auto' }}>
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <Box
              key={column.id}
              sx={{
                flex: '1 1 220px',
                minWidth: 220,
                maxWidth: 300,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.default',
                borderRadius: 1,
                border: 1,
                borderColor: 'divider',
                borderTop: 2,
                borderTopColor: column.color,
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <Box
                sx={{
                  p: 1,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="caption" fontWeight="medium" sx={{ textTransform: 'uppercase' }} color="text.secondary">
                  {column.label}
                </Typography>
                <Chip
                  label={columnTasks.length}
                  size="small"
                  sx={{ height: 20, fontSize: 10, bgcolor: mcColors.bgTertiary }}
                />
              </Box>

              {/* Tasks */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                <Stack spacing={1}>
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                      onClick={() => setEditingTask(task)}
                      isDragging={draggedTask?.id === task.id}
                    />
                  ))}
                </Stack>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Modals */}
      {showCreateModal && (
        <TaskModal onClose={() => setShowCreateModal(false)} workspaceId={workspaceId} />
      )}
      {editingTask && (
        <TaskModal task={editingTask} onClose={() => setEditingTask(null)} workspaceId={workspaceId} />
      )}
    </Box>
  );
}

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onClick: () => void;
  isDragging: boolean;
}

function TaskCard({ task, onDragStart, onClick, isDragging }: TaskCardProps) {
  const priorityColors = {
    low: mcColors.textSecondary,
    normal: mcColors.accent,
    high: mcColors.accentYellow,
    urgent: mcColors.accentRed,
  };

  const isPlanning = task.status === 'planning';

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(0.95)' : 'none',
        borderColor: isPlanning ? `${mcColors.accentPurple}40` : 'divider',
        '&:hover': {
          borderColor: isPlanning ? mcColors.accentPurple : `${mcColors.accent}40`,
          boxShadow: 4,
        },
        '&:hover .drag-handle': {
          opacity: 1,
        },
      }}
    >
      {/* Drag handle */}
      <Box
        className="drag-handle"
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 0.75,
          borderBottom: 1,
          borderColor: 'divider',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
      >
        <GripIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.5, cursor: 'grab' }} />
      </Box>

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Title */}
        <Typography
          variant="body2"
          fontWeight="medium"
          sx={{
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.title}
        </Typography>

        {/* Planning mode indicator */}
        {isPlanning && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
              py: 1,
              px: 1.5,
              bgcolor: `${mcColors.accentPurple}10`,
              borderRadius: 1,
              border: 1,
              borderColor: `${mcColors.accentPurple}20`,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                bgcolor: mcColors.accentPurple,
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }}
            />
            <Typography variant="caption" fontWeight="medium" sx={{ color: mcColors.accentPurple }}>
              Continue planning
            </Typography>
          </Box>
        )}

        {/* Assigned agent */}
        {task.assigned_agent && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 1.5,
              py: 0.75,
              px: 1,
              bgcolor: `${mcColors.bgTertiary}50`,
              borderRadius: 1,
            }}
          >
            <Typography>{(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {(task.assigned_agent as unknown as { name: string }).name}
            </Typography>
          </Box>
        )}

        {/* Footer */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pt: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: priorityColors[task.priority],
              }}
            />
            <Typography variant="caption" sx={{ color: priorityColors[task.priority], textTransform: 'capitalize' }}>
              {task.priority}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6, fontSize: 10 }}>
            {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
