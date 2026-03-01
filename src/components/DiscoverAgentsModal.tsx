'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  Checkbox,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useMissionControl } from '@/lib/store';
import type { DiscoveredAgent } from '@/lib/types';

interface DiscoverAgentsModalProps {
  onClose: () => void;
  workspaceId?: string;
}

export function DiscoverAgentsModal({ onClose, workspaceId }: DiscoverAgentsModalProps) {
  const { addAgent } = useMissionControl();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<DiscoveredAgent[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);

  const discover = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const res = await fetch('/api/agents/discover');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed to discover agents (${res.status})`);
        return;
      }
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    discover();
  }, [discover]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllAvailable = () => {
    const available = agents.filter((a) => !a.already_imported).map((a) => a.id);
    setSelectedIds(new Set(available));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const agentsToImport = agents
        .filter((a) => selectedIds.has(a.id))
        .map((a) => ({
          gateway_agent_id: a.id,
          name: a.name,
          model: a.model,
          workspace_id: workspaceId || 'default',
        }));

      const res = await fetch('/api/agents/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: agentsToImport }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to import agents');
        return;
      }

      const data = await res.json();

      for (const agent of data.imported) {
        addAgent(agent);
      }

      setImportResult({
        imported: data.imported.length,
        skipped: data.skipped.length,
      });

      await discover();
      setSelectedIds(new Set());
    } catch (err) {
      setError('Failed to import agents');
    } finally {
      setImporting(false);
    }
  };

  const availableCount = agents.filter((a) => !a.already_imported).length;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth sx={{ '& .MuiDialog-paper': { maxHeight: '80vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SearchIcon color="primary" />
            <Typography variant="h6">Discover Gateway Agents</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Import existing agents from the OpenClaw Gateway
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} sx={{ mr: 1.5 }} />
            <Typography color="text.secondary">Discovering agents from Gateway...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<WarningIcon />}>
            {error}
          </Alert>
        )}

        {importResult && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
            Imported {importResult.imported} agent{importResult.imported !== 1 ? 's' : ''}
            {importResult.skipped > 0 && ` (${importResult.skipped} skipped)`}
          </Alert>
        )}

        {!loading && !error && agents.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">No agents found in the Gateway.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Make sure the OpenClaw Gateway is running and has agents configured.
            </Typography>
          </Box>
        )}

        {!loading && agents.length > 0 && (
          <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {agents.length} agent{agents.length !== 1 ? 's' : ''} found
                {availableCount < agents.length && ` · ${agents.length - availableCount} already imported`}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" startIcon={<RefreshIcon />} onClick={discover}>
                  Refresh
                </Button>
                {availableCount > 0 && (
                  <>
                    <Button size="small" onClick={selectAllAvailable}>
                      Select All
                    </Button>
                    {selectedIds.size > 0 && (
                      <Button size="small" onClick={deselectAll}>
                        Deselect
                      </Button>
                    )}
                  </>
                )}
              </Stack>
            </Stack>

            <Stack spacing={1}>
              {agents.map((agent) => (
                <Box
                  key={agent.id}
                  onClick={() => !agent.already_imported && toggleSelection(agent.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    border: 1,
                    borderColor: selectedIds.has(agent.id) ? 'primary.main' : 'divider',
                    opacity: agent.already_imported ? 0.5 : 1,
                    cursor: agent.already_imported ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': !agent.already_imported ? { borderColor: 'primary.main' } : {},
                  }}
                >
                  <Checkbox
                    checked={selectedIds.has(agent.id)}
                    disabled={agent.already_imported}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelection(agent.id)}
                  />
                  <Typography variant="h5">🤖</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {agent.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {agent.model}
                    </Typography>
                  </Box>
                  {agent.already_imported && (
                    <Chip label="Imported" size="small" color="success" />
                  )}
                </Box>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          onClick={handleImport}
          disabled={selectedIds.size === 0 || importing}
        >
          {importing ? 'Importing...' : `Import ${selectedIds.size} Agent${selectedIds.size !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
