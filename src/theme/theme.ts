'use client';

import { createTheme } from '@mui/material/styles';

// Mission Control dark theme colors
const mcColors = {
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

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: mcColors.accent,
    },
    secondary: {
      main: mcColors.accentPink,
    },
    success: {
      main: mcColors.accentGreen,
    },
    warning: {
      main: mcColors.accentYellow,
    },
    error: {
      main: mcColors.accentRed,
    },
    info: {
      main: mcColors.accentCyan,
    },
    background: {
      default: mcColors.bg,
      paper: mcColors.bgSecondary,
    },
    text: {
      primary: mcColors.text,
      secondary: mcColors.textSecondary,
    },
    divider: mcColors.border,
  },
  typography: {
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
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: mcColors.bg,
          color: mcColors.text,
          scrollbarWidth: 'thin',
          scrollbarColor: `${mcColors.border} ${mcColors.bgSecondary}`,
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: mcColors.bgSecondary,
          },
          '&::-webkit-scrollbar-thumb': {
            background: mcColors.border,
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: mcColors.textSecondary,
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
          border: `1px solid ${mcColors.border}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${mcColors.border}`,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: mcColors.bg,
            '& fieldset': {
              borderColor: mcColors.border,
            },
            '&:hover fieldset': {
              borderColor: mcColors.accent,
            },
            '&.Mui-focused fieldset': {
              borderColor: mcColors.accent,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: mcColors.bg,
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
          backgroundColor: mcColors.bgSecondary,
          border: `1px solid ${mcColors.border}`,
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
            backgroundColor: mcColors.bgTertiary,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: mcColors.bg,
          border: `1px solid ${mcColors.border}`,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

// Export colors for use in components
export { mcColors };
export default theme;
