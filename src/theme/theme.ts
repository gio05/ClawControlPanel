'use client';

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Mission Control dark theme colors
export const darkColors = {
  bg: '#0d1117',
  bgSecondary: '#161b22',
  bgTertiary: '#21262d',
  border: '#30363d',
  text: '#c9d1d9',
  textSecondary: '#8b949e',
  accent: '#58a6ff',
  accentGreen: '#3fb950',
  accentYellow: '#d29922',
  accentRed: '#f85149',
  accentPurple: '#a371f7',
  accentPink: '#db61a2',
  accentCyan: '#39d353',
};

// Mission Control light theme colors
export const lightColors = {
  bg: '#ffffff',
  bgSecondary: '#f6f8fa',
  bgTertiary: '#eaeef2',
  border: '#d0d7de',
  text: '#1f2328',
  textSecondary: '#656d76',
  accent: '#0969da',
  accentGreen: '#1a7f37',
  accentYellow: '#9a6700',
  accentRed: '#cf222e',
  accentPurple: '#8250df',
  accentPink: '#bf3989',
  accentCyan: '#1b7c83',
};

// Helper to get colors based on mode
export const getColors = (mode: 'light' | 'dark') => 
  mode === 'dark' ? darkColors : lightColors;

// Alias for backwards compatibility
export const mcColors = darkColors;

// Shared typography
const typography: ThemeOptions['typography'] = {
  fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
  h1: {
    fontSize: '2rem',
    fontWeight: 700,
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  h4: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  body1: {
    fontSize: '0.875rem',
  },
  body2: {
    fontSize: '0.75rem',
  },
  button: {
    textTransform: 'none',
    fontWeight: 500,
  },
};

// Shared shape
const shape: ThemeOptions['shape'] = {
  borderRadius: 8,
};

// Create theme based on mode
const createMcTheme = (mode: 'light' | 'dark') => {
  const colors = getColors(mode);
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent,
      },
      secondary: {
        main: colors.accentPink,
      },
      success: {
        main: colors.accentGreen,
      },
      warning: {
        main: colors.accentYellow,
      },
      error: {
        main: colors.accentRed,
      },
      info: {
        main: colors.accentCyan,
      },
      background: {
        default: colors.bg,
        paper: colors.bgSecondary,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
      },
      divider: colors.border,
    },
    typography,
    shape,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: colors.bg,
            color: colors.text,
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} ${colors.bgSecondary}`,
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: colors.bgSecondary,
            },
            '&::-webkit-scrollbar-thumb': {
              background: colors.border,
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: colors.textSecondary,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${colors.border}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${colors.border}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: colors.bg,
              '& fieldset': {
                borderColor: colors.border,
              },
              '&:hover fieldset': {
                borderColor: colors.accent,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.accent,
              },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: colors.bg,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.bgSecondary,
            border: `1px solid ${colors.border}`,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: colors.bgTertiary,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: colors.bg,
            border: `1px solid ${colors.border}`,
            fontSize: '0.75rem',
            color: colors.text,
          },
        },
      },
    },
  });
};

// Pre-created themes
export const darkTheme = createMcTheme('dark');
export const lightTheme = createMcTheme('light');

// Export factory function
export { createMcTheme };

// Default export for backwards compatibility
export default darkTheme;
