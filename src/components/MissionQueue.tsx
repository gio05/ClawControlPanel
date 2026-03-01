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
  alpha,
  useTheme,
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
import { getColors } from '@/theme/theme';

interface MissionQueueProps {
  workspaceId?: string;
}

export function MissionQueue({ workspaceId }: MissionQueueProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  
  const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'planning', label: 'Planning', color: colors.accentPurple },
    { id: 'inbox', label: 'Inbox', color: colors.accentPink },
    { id: 'assigned', label: 'Assigned', color: colors.accentYellow },
    { id: 'in_progress', label: 'In Progress', color: colors.accent },
    { id: 'testing', label: 'Testing', color: colors.accentCyan },
    { id: 'review', label: 'Review', color: colors.accentPurple },
    { id: 'done', label: 'Done', color: colors.accentGreen },
  ];
  
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
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography 
            variant="body1" 
            fontWeight={600} 
            sx={{ letterSpacing: '-0.01em' }}
          >
            Mission Queue
          </Typography>
        </Stack>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowCreateModal(true)}
          sx={{ 
            bgcolor: colors.accent,
            '&:hover': { bgcolor: colors.accentHover },
          }}
        >
          New Task
        </Button>
      </Box>

      {/* Kanban Columns */}
      <Box sx={{ flex: 1, display: 'flex', gap: 2, p: 2, overflowX: 'auto', bgcolor: 'background.default' }}>
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <Box
              key={column.id}
              sx={{
                flex: '1 1 240px',
                minWidth: 240,
                maxWidth: 320,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden',
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <Box
                sx={{
                  p: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  bgcolor: alpha(column.color, 0.04),
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: column.color,
                    }} 
                  />
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color="text.primary"
                  >
                    {column.label}
                  </Typography>
                </Stack>
                <Chip
                  label={columnTasks.length}
                  size="small"
                  sx={{ 
                    height: 22, 
                    fontSize: 11, 
                    fontWeight: 600,
                    bgcolor: alpha(column.color, 0.1),
                    color: column.color,
                  }}
                />
              </Box>

              {/* Tasks */}
              <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
                <Stack spacing={1.5}>
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      colors={colors}
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
  colors: ReturnType<typeof getColors>;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onClick: () => void;
  isDragging: boolean;
}

function TaskCard({ task, colors, onDragStart, onClick, isDragging }: TaskCardProps) {
  const priorityColors = {
    low: colors.accentBlue,
    normal: colors.accent,
    high: colors.accentYellow,
    urgent: colors.accentRed,
  };
  
  const priorityBgColors = {
    low: colors.accentBlueBg,
    normal: alpha(colors.accent, 0.1),
    high: colors.accentYellowBg,
    urgent: colors.accentRedBg,
  };

  const isPlanning = task.status === 'planning';

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.15s ease-in-out',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'scale(0.98)' : 'none',
        borderColor: isPlanning ? alpha(colors.accentPurple, 0.3) : 'transparent',
        boxShadow: 'none',
        '&:hover': {
          borderColor: isPlanning ? colors.accentPurple : alpha(colors.accent, 0.3),
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
          py: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          opacity: 0,
          transition: 'opacity 0.15s',
          bgcolor: alpha(colors.accent, 0.02),
        }}
      >
        <GripIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.4, cursor: 'grab' }} />
      </Box>

      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Title */}
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.4,
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
              py: 0.75,
              px: 1.25,
              bgcolor: colors.accentPurpleBg,
              borderRadius: 1.5,
              border: 1,
              borderColor: alpha(colors.accentPurple, 0.2),
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                bgcolor: colors.accentPurple,
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }}
            />
            <Typography variant="caption" fontWeight={500} sx={{ color: colors.accentPurple }}>
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
              py: 0.5,
              px: 1,
              bgcolor: colors.bgTertiary,
              borderRadius: 1.5,
            }}
          >
            <Typography sx={{ fontSize: '0.875rem' }}>{(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500} noWrap>
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
            pt: 1.5,
            mt: 0.5,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Chip
            size="small"
            label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            sx={{
              height: 20,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: priorityBgColors[task.priority],
              color: priorityColors[task.priority],
              border: 1,
              borderColor: alpha(priorityColors[task.priority], 0.2),
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7, fontSize: 10 }}>
            {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
