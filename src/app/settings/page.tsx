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
  alpha,
  useTheme,
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
import { getColors } from '@/theme/theme';

export default function SettingsPage() {
  const router = useRouter();
  const theme = useTheme();
  const colors = getColors(theme.palette.mode);
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
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={2.5}>
              <IconButton 
                onClick={() => router.push('/')} 
                title="Back to Mission Control"
                sx={{ 
                  color: 'text.secondary',
                  '&:hover': { color: colors.accent },
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: alpha(colors.accent, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SettingsIcon sx={{ color: colors.accent }} />
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>Settings</Typography>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <Button
                onClick={handleReset}
                startIcon={<RefreshIcon />}
                variant="outlined"
                sx={{
                  borderColor: colors.border,
                  color: 'text.secondary',
                  '&:hover': {
                    borderColor: colors.accent,
                    color: colors.accent,
                  },
                }}
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                startIcon={<SaveIcon />}
                variant="contained"
                sx={{
                  bgcolor: colors.accent,
                  '&:hover': { bgcolor: colors.accentHover },
                }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* Success Message */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
            ✓ Settings saved successfully
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            ✗ {error}
          </Alert>
        )}

        {/* Workspace Paths */}
        <Paper sx={{ p: 4, mb: 3, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: alpha(colors.accent, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderIcon sx={{ color: colors.accent, fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>Workspace Paths</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
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
        <Paper sx={{ p: 4, mb: 3, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: alpha(colors.accent, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LinkIcon sx={{ color: colors.accent, fontSize: 18 }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>API Configuration</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
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
        <Paper sx={{ p: 4, bgcolor: alpha(colors.accent, 0.04), border: 1, borderColor: alpha(colors.accent, 0.15), borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: colors.accent, mb: 1.5 }}>
            📝 Environment Variables
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.6 }}>
            Some settings are also configurable via environment variables in{' '}
            <Box component="code" sx={{ px: 1, py: 0.5, bgcolor: colors.bgTertiary, borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8125rem' }}>
              .env.local
            </Box>
            :
          </Typography>
          <Box component="ul" sx={{ ml: 2, color: 'text.secondary', '& li': { mb: 0.5 }, '& code': { color: colors.accent, fontFamily: 'monospace', fontSize: '0.8125rem' } }}>
            <li><code>MISSION_CONTROL_URL</code> - API URL override</li>
            <li><code>WORKSPACE_BASE_PATH</code> - Base workspace directory</li>
            <li><code>PROJECTS_PATH</code> - Projects directory</li>
            <li><code>OPENCLAW_GATEWAY_URL</code> - Gateway WebSocket URL</li>
            <li><code>OPENCLAW_GATEWAY_TOKEN</code> - Gateway auth token</li>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2.5, display: 'block', opacity: 0.9 }}>
            Environment variables take precedence over UI settings for server-side operations.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
