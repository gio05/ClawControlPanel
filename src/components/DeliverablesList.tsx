'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Link as MuiLink,
  useTheme,
} from '@mui/material';
import {
  Description as FileIcon,
  Link as LinkIcon,
  Inventory as PackageIcon,
  OpenInNew as ExternalLinkIcon,
  Visibility as EyeIcon,
} from '@mui/icons-material';
import { debug } from '@/lib/debug';
import type { TaskDeliverable } from '@/lib/types';
import { getColors } from '@/theme/theme';

interface DeliverablesListProps {
  taskId: string;
}

export function DeliverablesList({ taskId }: DeliverablesListProps) {
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
  const [deliverables, setDeliverables] = useState<TaskDeliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeliverables = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/deliverables`);
      if (res.ok) {
        const data = await res.json();
        setDeliverables(data);
      }
    } catch (error) {
      console.error('Failed to load deliverables:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadDeliverables();
  }, [loadDeliverables]);

  const getDeliverableIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileIcon />;
      case 'url':
        return <LinkIcon />;
      case 'artifact':
        return <PackageIcon />;
      default:
        return <FileIcon />;
    }
  };

  const handleOpen = async (deliverable: TaskDeliverable) => {
    if (deliverable.deliverable_type === 'url' && deliverable.path) {
      window.open(deliverable.path, '_blank');
      return;
    }

    if (deliverable.path) {
      try {
        debug.file('Opening file in Finder', { path: deliverable.path });
        const res = await fetch('/api/files/reveal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: deliverable.path }),
        });

        if (res.ok) {
          debug.file('Opened in Finder successfully');
          return;
        }

        const error = await res.json();
        debug.file('Failed to open', error);

        if (res.status === 404) {
          alert(`File not found:\n${deliverable.path}\n\nThe file may have been moved or deleted.`);
        } else if (res.status === 403) {
          alert(`Cannot open this location:\n${deliverable.path}\n\nPath is outside allowed directories.`);
        } else {
          throw new Error(error.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Failed to open file:', error);
        try {
          await navigator.clipboard.writeText(deliverable.path);
          alert(`Could not open Finder. Path copied to clipboard:\n${deliverable.path}`);
        } catch {
          alert(`File path:\n${deliverable.path}`);
        }
      }
    }
  };

  const handlePreview = (deliverable: TaskDeliverable) => {
    if (deliverable.path) {
      debug.file('Opening preview', { path: deliverable.path });
      window.open(`/api/files/preview?path=${encodeURIComponent(deliverable.path)}`, '_blank');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
        <Typography color="text.secondary" sx={{ ml: 2 }}>
          Loading deliverables...
        </Typography>
      </Box>
    );
  }

  if (deliverables.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>📦</Typography>
        <Typography color="text.secondary">No deliverables yet</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {deliverables.map((deliverable) => (
        <Box
          key={deliverable.id}
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 1.5,
            bgcolor: 'background.default',
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            transition: 'border-color 0.2s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ color: 'primary.main' }}>
            {getDeliverableIcon(deliverable.deliverable_type)}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
              {deliverable.deliverable_type === 'url' && deliverable.path ? (
                <MuiLink
                  href={deliverable.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'medium' }}
                >
                  {deliverable.title}
                  <ExternalLinkIcon sx={{ fontSize: 14 }} />
                </MuiLink>
              ) : (
                <Typography variant="body2" fontWeight="medium">
                  {deliverable.title}
                </Typography>
              )}
              <Stack direction="row" spacing={0.5}>
                {deliverable.deliverable_type === 'file' && deliverable.path?.endsWith('.html') && (
                  <IconButton size="small" onClick={() => handlePreview(deliverable)} title="Preview in browser">
                    <EyeIcon sx={{ fontSize: 16, color: colors.accent }} />
                  </IconButton>
                )}
                {deliverable.path && (
                  <IconButton size="small" onClick={() => handleOpen(deliverable)} title={deliverable.deliverable_type === 'url' ? 'Open URL' : 'Reveal in Finder'}>
                    <ExternalLinkIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Stack>
            </Box>

            {deliverable.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {deliverable.description}
              </Typography>
            )}

            {deliverable.path && (
              <Box
                sx={{
                  mt: 1,
                  p: 1,
                  bgcolor: colors.bgSecondary,
                  borderRadius: 1.5,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: deliverable.deliverable_type === 'url' ? 'primary.main' : 'text.secondary',
                  wordBreak: 'break-all',
                }}
              >
                {deliverable.path}
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {formatTimestamp(deliverable.created_at)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
