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
import { mcColors } from '@/theme/theme';

export function WorkspaceDashboard() {
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
        <Stack alignItems="center" spacing={2}>
          <Typography variant="h2" sx={{ animation: 'pulse 2s infinite' }}>
            🦞
          </Typography>
          <Typography color="text.secondary">Loading workspaces...</Typography>
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
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4">🦞</Typography>
            <Typography variant="h6" fontWeight="bold">
              Mission Control
            </Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowCreateModal(true)}
          >
            New Workspace
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main" sx={{ maxWidth: '1200px', mx: 'auto', px: 3, py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            All Workspaces
          </Typography>
          <Typography color="text.secondary">
            Select a workspace to view its mission queue and agents
          </Typography>
        </Box>

        {workspaces.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No workspaces yet
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Create your first workspace to get started
            </Typography>
            <Button variant="contained" onClick={() => setShowCreateModal(true)}>
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
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  minHeight: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => setShowCreateModal(true)}
              >
                <Stack alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      bgcolor: mcColors.bgTertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AddIcon color="action" />
                  </Box>
                  <Typography color="text.secondary" fontWeight="medium">
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
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.main',
              boxShadow: 4,
            },
            '&:hover .delete-btn': {
              opacity: 1,
            },
            '&:hover .arrow-icon': {
              color: 'primary.main',
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography variant="h4">{workspace.icon}</Typography>
                <Box>
                  <Typography
                    variant="subtitle1"
                    fontWeight="semibold"
                    sx={{ '&:hover': { color: 'primary.main' } }}
                  >
                    {workspace.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
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
                      transition: 'opacity 0.2s',
                      '&:hover': {
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <ArrowForwardIcon
                  className="arrow-icon"
                  sx={{ color: 'text.secondary', transition: 'color 0.2s' }}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <CheckBoxIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {workspace.taskCounts.total} tasks
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
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
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'error.main',
                opacity: 0.2,
              }}
            >
              <WarningIcon color="error" />
            </Box>
            <Box>
              <Typography variant="h6">Delete Workspace</Typography>
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
            color="error"
            onClick={handleDelete}
            disabled={deleting || workspace.taskCounts.total > 0 || workspace.agentCount > 0}
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
      <DialogTitle>Create New Workspace</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3}>
            {/* Icon selector */}
            <Box>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Icon
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {icons.map((i) => (
                  <Box
                    key={i}
                    onClick={() => setIcon(i)}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      fontSize: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: 2,
                      borderColor: icon === i ? 'primary.main' : 'divider',
                      bgcolor: icon === i ? 'primary.dark' : 'background.default',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
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
              label="Name"
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
          >
            {isSubmitting ? 'Creating...' : 'Create Workspace'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
