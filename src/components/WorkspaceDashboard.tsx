'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Folder as FolderIcon,
  People as PeopleIcon,
  CheckBox as CheckBoxIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { WorkspaceStats } from '@/lib/types';
import { getColors } from '@/theme/theme';

export function WorkspaceDashboard() {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [workspaces, setWorkspaces] = useState<WorkspaceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces?stats=true');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack alignItems="center" spacing={3}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              bgcolor: alpha(colors.accent, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
            }}
          >
            <Typography variant="h3">🦞</Typography>
          </Box>
          <Typography color="text.secondary" fontWeight={500}>Loading workspaces...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        component="header"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            maxWidth: '1200px',
            mx: 'auto',
            px: 4,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: alpha(colors.accent, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h5">🦞</Typography>
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
              Mission Control
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
            sx={{
              bgcolor: colors.accent,
              '&:hover': { bgcolor: colors.accentHover },
            }}
          >
            New Workspace
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ maxWidth: '1200px', mx: 'auto', px: 4, py: 5 }}>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ letterSpacing: '-0.02em' }}>
            All Workspaces
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: '1rem' }}>
            Select a workspace to view its mission queue and agents
          </Typography>
        </Box>

        {workspaces.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 4,
                bgcolor: colors.bgTertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <FolderIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            </Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              No workspaces yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Create your first workspace to get started
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => setShowCreateModal(true)}
              sx={{
                bgcolor: colors.accent,
                '&:hover': { bgcolor: colors.accentHover },
              }}
            >
              Create Workspace
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {workspaces.map((workspace) => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={workspace.id}>
                <WorkspaceCard
                  workspace={workspace}
                  onDelete={(id) => setWorkspaces(workspaces.filter((w) => w.id !== id))}
                />
              </Grid>
            ))}

            {/* Add workspace card */}
            <Grid size={{ xs: 12, md: 6, lg: 4 }}>
              <Card
                sx={{
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  bgcolor: 'transparent',
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: colors.accent,
                    bgcolor: alpha(colors.accent, 0.02),
                  },
                }}
                onClick={() => setShowCreateModal(true)}
              >
                <Stack alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      bgcolor: colors.bgTertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <AddIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
                  </Box>
                  <Typography color="text.secondary" fontWeight={500}>
                    Add Workspace
                  </Typography>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadWorkspaces();
          }}
        />
      )}
    </Box>
  );
}

function WorkspaceCard({
  workspace,
  onDelete,
}: {
  workspace: WorkspaceStats;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(workspace.id);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete workspace');
      }
    } catch {
      alert('Failed to delete workspace');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Link href={`/workspace/${workspace.slug}`} style={{ textDecoration: 'none' }}>
        <Card
          sx={{
            transition: 'all 0.2s ease-in-out',
            minHeight: 180,
            '&:hover': {
              borderColor: alpha(colors.accent, 0.4),
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            },
            '&:hover .delete-btn': {
              opacity: 1,
            },
            '&:hover .arrow-icon': {
              color: colors.accent,
              transform: 'translateX(4px)',
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    bgcolor: alpha(colors.accent, 0.08),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h4">{workspace.icon}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight={600}
                    sx={{ 
                      color: 'text.primary',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {workspace.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                    /{workspace.slug}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                {workspace.id !== 'default' && (
                  <IconButton
                    className="delete-btn"
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    sx={{
                      opacity: 0,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: colors.accentRedBg,
                        color: colors.accentRed,
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <ArrowForwardIcon
                  className="arrow-icon"
                  sx={{ 
                    color: 'text.secondary', 
                    transition: 'all 0.2s',
                    fontSize: 20,
                  }}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: colors.accentBlueBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckBoxIcon sx={{ fontSize: 14, color: colors.accentBlue }} />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {workspace.taskCounts.total} tasks
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: colors.accentPurpleBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PeopleIcon sx={{ fontSize: 14, color: colors.accentPurple }} />
                </Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {workspace.agentCount} agents
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Link>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: colors.accentRedBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WarningIcon sx={{ color: colors.accentRed }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={600}>Delete Workspace</Typography>
              <Typography variant="body2" color="text.secondary">
                This action cannot be undone
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Are you sure you want to delete <strong>{workspace.name}</strong>?
          </Typography>
          {workspace.taskCounts.total > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              ⚠️ This workspace has {workspace.taskCounts.total} task(s). Delete them first.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDelete}
            disabled={deleting || workspace.taskCounts.total > 0 || workspace.agentCount > 0}
            sx={{
              bgcolor: colors.accentRed,
              '&:hover': { bgcolor: alpha(colors.accentRed, 0.9) },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Workspace'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function CreateWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const icons = ['📁', '💼', '🏢', '🚀', '💡', '🎯', '📊', '🔧', '🌟', '🏠'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), icon }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create workspace');
      }
    } catch {
      setError('Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>Create New Workspace</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={4}>
            {/* Icon selector */}
            <Box>
              <Typography variant="body2" fontWeight={600} gutterBottom color="text.secondary">
                Icon
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {icons.map((i) => (
                  <Box
                    key={i}
                    onClick={() => setIcon(i)}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      fontSize: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 2,
                      borderColor: icon === i ? colors.accent : colors.border,
                      bgcolor: icon === i ? alpha(colors.accent, 0.1) : 'transparent',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': {
                        borderColor: colors.accent,
                        bgcolor: alpha(colors.accent, 0.05),
                      },
                    }}
                  >
                    {i}
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Name input */}
            <TextField
              label="Workspace Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corp"
              fullWidth
              autoFocus
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!name.trim() || isSubmitting}
            sx={{
              bgcolor: colors.accent,
              '&:hover': { bgcolor: colors.accentHover },
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
