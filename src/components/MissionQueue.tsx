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
  AccessTime as TimeIcon,
  Person as PersonIcon,
  FlagOutlined as FlagIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import { triggerAutoDispatch, shouldTriggerAutoDispatch } from '@/lib/auto-dispatch';
import type { Task, TaskStatus, OpenClawSession } from '@/lib/types';
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
  
  const { tasks, updateTaskStatus, addEvent, agentOpenClawSessions } = useMissionControl();
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

        // Check if we should auto-dispatch (only status changes here, agent stays the same)
        if (shouldTriggerAutoDispatch(
          draggedTask.status, 
          targetStatus, 
          draggedTask.assigned_agent_id,
          draggedTask.assigned_agent_id  // Same agent (no change)
        )) {
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
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
          flexShrink: 0,
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
      <Box 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          gap: 3, 
          p: 3, 
          overflowX: 'auto', 
          overflowY: 'auto',
          bgcolor: 'background.default',
          minHeight: 0,
        }}
      >
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <Box
              key={column.id}
              sx={{
                flex: '1 1 280px',
                minWidth: 280,
                maxWidth: 320,
                display: 'flex',
                flexDirection: 'column',
              }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography 
                  variant="caption" 
                  fontWeight={700} 
                  sx={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'text.secondary',
                  }}
                >
                  {column.label}
                </Typography>
                <Box
                  sx={{ 
                    minWidth: 24,
                    height: 24,
                    px: 1,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(column.color, 0.1),
                  }}
                >
                  <Typography 
                    variant="caption" 
                    fontWeight={700}
                    sx={{ color: column.color }}
                  >
                    {columnTasks.length}
                  </Typography>
                </Box>
              </Box>

              {/* Tasks */}
              <Stack spacing={1.5} sx={{ flex: 1 }}>
                {columnTasks.map((task) => {
                  const agentSession = task.assigned_agent_id 
                    ? agentOpenClawSessions[task.assigned_agent_id] 
                    : null;
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      colors={colors}
                      onDragStart={handleDragStart}
                      onClick={() => setEditingTask(task)}
                      isDragging={draggedTask?.id === task.id}
                      agentSession={agentSession}
                    />
                  );
                })}
                
                {/* Add Task Placeholder */}
                <Box
                  onClick={() => setShowCreateModal(true)}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '2px dashed',
                    borderColor: alpha(colors.textSecondary, 0.2),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      borderColor: colors.accent,
                      bgcolor: alpha(colors.accent, 0.04),
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AddIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Add Task
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
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
  agentSession: OpenClawSession | null;
}

function TaskCard({ task, colors, onDragStart, onClick, isDragging, agentSession }: TaskCardProps) {
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

  const priorityEmoji = {
    low: '🔵',
    normal: '⚪',
    high: '🟡',
    urgent: '🔴',
  };

  const isPlanning = task.status === 'planning';
  const hasDescription = task.description && task.description.trim().length > 0;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDragging ? 0.6 : 1,
        transform: isDragging ? 'scale(0.95) rotate(2deg)' : 'none',
        borderLeft: 4,
        borderColor: priorityColors[task.priority],
        borderTop: 1,
        borderRight: 1,
        borderBottom: 1,
        borderTopColor: alpha(colors.border, 0.5),
        borderRightColor: alpha(colors.border, 0.5),
        borderBottomColor: alpha(colors.border, 0.5),
        boxShadow: isDragging 
          ? `0 8px 24px ${alpha(priorityColors[task.priority], 0.3)}`
          : `0 1px 3px ${alpha(colors.text, 0.04)}`,
        bgcolor: colors.bgCard,
        '&:hover': {
          transform: 'translateY(-3px) scale(1.01)',
          boxShadow: `0 8px 24px ${alpha(colors.text, 0.1)}, 0 0 0 1px ${alpha(priorityColors[task.priority], 0.2)}`,
          borderTopColor: alpha(priorityColors[task.priority], 0.3),
          borderRightColor: alpha(priorityColors[task.priority], 0.3),
          borderBottomColor: alpha(priorityColors[task.priority], 0.3),
        },
        '&:active': {
          transform: 'scale(0.98)',
        },
        '&::before': isPlanning ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${alpha(colors.accentPurple, 0.05)} 0%, transparent 50%)`,
          pointerEvents: 'none',
          borderRadius: 'inherit',
        } : undefined,
      }}
    >
      <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
        {/* Planning mode indicator - compact at top */}
        {isPlanning && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              mb: 1.25,
              py: 0.5,
              px: 1,
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
                boxShadow: `0 0 6px ${alpha(colors.accentPurple, 0.6)}`,
              }}
            />
            <Typography variant="caption" fontWeight={600} sx={{ color: colors.accentPurple, fontSize: '0.65rem' }}>
              Planning...
            </Typography>
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{
            mb: hasDescription ? 0.75 : 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.45,
            color: colors.text,
            fontSize: '0.85rem',
          }}
        >
          {task.title}
        </Typography>

        {/* Description preview */}
        {hasDescription && (
          <Typography
            variant="caption"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              color: alpha(colors.textSecondary, 0.8),
              lineHeight: 1.5,
              mb: 1.5,
              fontSize: '0.72rem',
            }}
          >
            {task.description}
          </Typography>
        )}

        {/* Footer: Two rows - Agent/Status and Priority/Time */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            mt: 0.5,
            pt: 1.5,
            borderTop: 1,
            borderColor: alpha(colors.border, 0.3),
          }}
        >
          {/* Row 1: Assigned agent and status */}
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            {task.assigned_agent ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 0.75,
                  py: 0.5,
                  px: 1,
                  width: '100%',
                  bgcolor: agentSession 
                    ? alpha(colors.accentGreen, 0.08)
                    : alpha(colors.accent, 0.06),
                  borderRadius: 2,
                  border: 1,
                  borderColor: agentSession 
                    ? alpha(colors.accentGreen, 0.2)
                    : 'transparent',
                }}
              >
                {/* Left side: Avatar + Agent name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                  {/* Avatar with status indicator */}
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: agentSession 
                          ? alpha(colors.accentGreen, 0.15)
                          : alpha(colors.accent, 0.1),
                        borderRadius: '50%',
                        fontSize: '0.7rem',
                      }}
                    >
                      {(task.assigned_agent as unknown as { avatar_emoji: string }).avatar_emoji || '🤖'}
                    </Box>
                    {/* Active session indicator dot */}
                    {agentSession && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -1,
                          right: -1,
                          width: 8,
                          height: 8,
                          bgcolor: colors.accentGreen,
                          borderRadius: '50%',
                          border: 2,
                          borderColor: colors.bgCard,
                          animation: 'pulse 2s infinite',
                          boxShadow: `0 0 6px ${alpha(colors.accentGreen, 0.6)}`,
                        }}
                      />
                    )}
                  </Box>
                  <Typography 
                    variant="caption" 
                    fontWeight={500} 
                    noWrap
                    sx={{ 
                      color: agentSession ? colors.accentGreen : colors.textSecondary,
                      fontSize: '0.7rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {(task.assigned_agent as unknown as { name: string }).name}
                  </Typography>
                </Box>

                {/* Right side: Status badge */}
                {agentSession ? (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.375,
                      py: 0.25,
                      px: 0.625,
                      bgcolor: alpha(colors.accentGreen, 0.15),
                      borderRadius: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        bgcolor: colors.accentGreen,
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: colors.accentGreen,
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                      }}
                    >
                      Working
                    </Typography>
                  </Box>
                ) : task.status === 'in_progress' ? (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: alpha(colors.textSecondary, 0.6),
                      fontSize: '0.6rem',
                      fontStyle: 'italic',
                      flexShrink: 0,
                    }}
                  >
                    Idle
                  </Typography>
                ) : null}
              </Box>
            ) : (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: alpha(colors.textSecondary, 0.5),
                  fontSize: '0.7rem',
                  fontStyle: 'italic',
                }}
              >
                No agent assigned
              </Typography>
            )}
          </Box>

          {/* Row 2: Priority and Time */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Priority badge */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                py: 0.375,
                px: 0.875,
                bgcolor: priorityBgColors[task.priority],
                borderRadius: 1.5,
                border: 1,
                borderColor: alpha(priorityColors[task.priority], 0.2),
              }}
            >
              <Typography sx={{ fontSize: '0.6rem', lineHeight: 1 }}>
                {priorityEmoji[task.priority]}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: priorityColors[task.priority],
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                }}
              >
                {task.priority}
              </Typography>
            </Box>

            {/* Time */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TimeIcon sx={{ fontSize: 11, color: 'text.disabled' }} />
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'text.disabled',
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
