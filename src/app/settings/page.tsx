/**
 * Settings Page
 * Configure Mission Control paths, URLs, and preferences
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Stack,
  Alert,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Folder as FolderIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { getConfig, updateConfig, resetConfig, type MissionControlConfig } from '@/lib/config';
import { mcColors } from '@/theme/theme';

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<MissionControlConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(getConfig());
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      updateConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      resetConfig();
      setConfig(getConfig());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleChange = (field: keyof MissionControlConfig, value: string) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (!config) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="md">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <IconButton onClick={() => router.push('/')} title="Back to Mission Control">
                <ArrowBackIcon />
              </IconButton>
              <SettingsIcon color="primary" />
              <Typography variant="h5" fontWeight="bold">Settings</Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                onClick={handleReset}
                startIcon={<RefreshIcon />}
                variant="outlined"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                startIcon={<SaveIcon />}
                variant="contained"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Success Message */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✓ Settings saved successfully
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            ✗ {error}
          </Alert>
        )}

        {/* Workspace Paths */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <FolderIcon color="primary" />
            <Typography variant="h6">Workspace Paths</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure where Mission Control stores projects and deliverables.
          </Typography>

          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Workspace Base Path"
              value={config.workspaceBasePath}
              onChange={(e) => handleChange('workspaceBasePath', e.target.value)}
              placeholder="~/Documents/Shared"
              helperText="Base directory for all Mission Control files. Use ~ for home directory."
            />

            <TextField
              fullWidth
              label="Projects Path"
              value={config.projectsPath}
              onChange={(e) => handleChange('projectsPath', e.target.value)}
              placeholder="~/Documents/Shared/projects"
              helperText="Directory where project folders are created. Each project gets its own folder."
            />

            <TextField
              fullWidth
              label="Default Project Name"
              value={config.defaultProjectName}
              onChange={(e) => handleChange('defaultProjectName', e.target.value)}
              placeholder="mission-control"
              helperText="Default name for new projects. Can be changed per project."
            />
          </Stack>
        </Paper>

        {/* API Configuration */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <LinkIcon color="primary" />
            <Typography variant="h6">API Configuration</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure Mission Control API URL for agent orchestration.
          </Typography>

          <TextField
            fullWidth
            label="Mission Control URL"
            value={config.missionControlUrl}
            onChange={(e) => handleChange('missionControlUrl', e.target.value)}
            placeholder="http://localhost:4000"
            helperText="URL where Mission Control is running. Auto-detected by default. Change for remote access."
          />
        </Paper>

        {/* Environment Variables Note */}
        <Paper sx={{ p: 3, bgcolor: `${mcColors.accent}10`, border: 1, borderColor: `${mcColors.accent}30` }}>
          <Typography variant="h6" sx={{ color: mcColors.accent, mb: 1 }}>
            📝 Environment Variables
          </Typography>
          <Typography variant="body2" sx={{ color: mcColors.accent, mb: 2 }}>
            Some settings are also configurable via environment variables in{' '}
            <Box component="code" sx={{ px: 1, py: 0.5, bgcolor: 'background.default', borderRadius: 1 }}>
              .env.local
            </Box>
            :
          </Typography>
          <Box component="ul" sx={{ ml: 2, color: mcColors.accent }}>
            <li><code>MISSION_CONTROL_URL</code> - API URL override</li>
            <li><code>WORKSPACE_BASE_PATH</code> - Base workspace directory</li>
            <li><code>PROJECTS_PATH</code> - Projects directory</li>
            <li><code>OPENCLAW_GATEWAY_URL</code> - Gateway WebSocket URL</li>
            <li><code>OPENCLAW_GATEWAY_TOKEN</code> - Gateway auth token</li>
          </Box>
          <Typography variant="caption" sx={{ color: mcColors.accent, mt: 2, display: 'block' }}>
            Environment variables take precedence over UI settings for server-side operations.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
