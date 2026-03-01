'use client';

import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';

// ============================================================================
// PREMIUM SAAS DESIGN SYSTEM
// Inspired by: Linear, Notion, Asana
// Style: Minimal, Corporate, Sophisticated, Functional
// ============================================================================

// Light theme colors - Premium SaaS palette
export const lightColors = {
  // Base neutrals - soft, comfortable, spacious
  bg: '#f8f9fb',              // General background - cool light gray (almost white)
  bgSecondary: '#f1f3f6',     // Sidebar background - slightly marked gray
  bgTertiary: '#e8ebf0',      // Hover states, subtle backgrounds
  bgCard: '#ffffff',          // Cards - pure white for contrast
  
  // Borders - subtle, refined
  border: '#e2e6ed',          // Main border color
  borderLight: '#eef1f5',     // Lighter borders for cards
  borderHover: '#d0d5df',     // Border on hover
  
  // Text hierarchy - clear readability
  text: '#1a1d24',            // Primary text - near black
  textSecondary: '#6b7280',   // Secondary text - medium soft gray
  textTertiary: '#9ca3af',    // Tertiary/disabled text
  
  // Primary accent - Blue with purple tint (technological, trustworthy)
  accent: '#6366f1',          // Primary blue-purple accent
  accentHover: '#5558e8',     // Hover state
  accentLight: '#eef2ff',     // Light accent background
  accentMuted: '#a5b4fc',     // Muted accent for secondary use
  
  // Semantic colors - Low saturation, soft pastels
  accentGreen: '#10b981',     // Success - soft green
  accentGreenBg: '#ecfdf5',   // Success background
  accentYellow: '#f59e0b',    // Warning - medium priority
  accentYellowBg: '#fffbeb',  // Warning background
  accentRed: '#ef4444',       // Error/high priority - soft red
  accentRedBg: '#fef2f2',     // Error background
  accentPurple: '#8b5cf6',    // Category/info - violet
  accentPurpleBg: '#f5f3ff',  // Purple background
  accentBlue: '#3b82f6',      // Low priority - clear blue
  accentBlueBg: '#eff6ff',    // Blue background
  accentPink: '#ec4899',      // Accent pink
  accentCyan: '#06b6d4',      // Accent cyan
};

// Dark theme colors - Refined dark mode
export const darkColors = {
  // Base neutrals
  bg: '#0f1117',              // Deep dark background
  bgSecondary: '#161922',     // Sidebar/secondary areas
  bgTertiary: '#1e222d',      // Cards and elevated surfaces
  bgCard: '#1a1e28',          // Card background
  
  // Borders
  border: '#2a2f3c',          // Main border
  borderLight: '#232836',     // Lighter borders
  borderHover: '#3a4050',     // Border on hover
  
  // Text
  text: '#f3f4f6',            // Primary text
  textSecondary: '#9ca3af',   // Secondary text
  textTertiary: '#6b7280',    // Tertiary text
  
  // Primary accent
  accent: '#818cf8',          // Slightly brighter for dark mode
  accentHover: '#a5b4fc',     // Hover state
  accentLight: '#1e1b4b',     // Dark accent background
  accentMuted: '#6366f1',     // Muted accent
  
  // Semantic colors - Adjusted for dark mode
  accentGreen: '#34d399',
  accentGreenBg: '#064e3b',
  accentYellow: '#fbbf24',
  accentYellowBg: '#451a03',
  accentRed: '#f87171',
  accentRedBg: '#450a0a',
  accentPurple: '#a78bfa',
  accentPurpleBg: '#2e1065',
  accentBlue: '#60a5fa',
  accentBlueBg: '#1e3a5f',
  accentPink: '#f472b6',
  accentCyan: '#22d3ee',
};

// Helper to get colors based on mode
export const getColors = (mode: 'light' | 'dark') => 
  mode === 'dark' ? darkColors : lightColors;

// Alias for backwards compatibility
export const mcColors = lightColors;

// ============================================================================
// TYPOGRAPHY - Modern Sans-Serif
// Clear, professional, legible hierarchy
// ============================================================================
const typography: ThemeOptions['typography'] = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  h1: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h5: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.5,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  body1: {
    fontSize: '0.9375rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.8125rem',
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
    letterSpacing: '0.01em',
  },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  button: {
    textTransform: 'none',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
};

// ============================================================================
// SHAPE - Modern Rounded Corners
// Friendly, modern, fluid visual feel
// ============================================================================
const shape: ThemeOptions['shape'] = {
  borderRadius: 12,
};

// ============================================================================
// THEME FACTORY
// Creates complete MUI theme with Premium SaaS styling
// ============================================================================
const createMcTheme = (mode: 'light' | 'dark') => {
  const colors = getColors(mode);
  const isLight = mode === 'light';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent,
        light: colors.accentMuted,
        dark: colors.accentHover,
        contrastText: '#ffffff',
      },
      secondary: {
        main: colors.accentPurple,
        light: colors.accentPurpleBg,
      },
      success: {
        main: colors.accentGreen,
        light: colors.accentGreenBg,
      },
      warning: {
        main: colors.accentYellow,
        light: colors.accentYellowBg,
      },
      error: {
        main: colors.accentRed,
        light: colors.accentRedBg,
      },
      info: {
        main: colors.accentBlue,
        light: colors.accentBlueBg,
      },
      background: {
        default: colors.bg,
        paper: colors.bgCard,
      },
      text: {
        primary: colors.text,
        secondary: colors.textSecondary,
        disabled: colors.textTertiary,
      },
      divider: colors.border,
      action: {
        hover: alpha(colors.accent, 0.04),
        selected: alpha(colors.accent, 0.08),
        focus: alpha(colors.accent, 0.12),
      },
    },
    typography,
    shape,
    spacing: 8, // Base spacing unit
    
    // ========================================================================
    // COMPONENT OVERRIDES - Premium SaaS Styling
    // ========================================================================
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            boxSizing: 'border-box',
          },
          html: {
            MozOsxFontSmoothing: 'grayscale',
            WebkitFontSmoothing: 'antialiased',
          },
          body: {
            backgroundColor: colors.bg,
            color: colors.text,
            scrollbarWidth: 'thin',
            scrollbarColor: `${colors.border} transparent`,
            '&::-webkit-scrollbar': {
              width: '6px',
              height: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: colors.border,
              borderRadius: '3px',
              '&:hover': {
                background: colors.textTertiary,
              },
            },
          },
        },
      },
      
      // Buttons - Clean, subtle shadows, premium feel
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 20px',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'all 0.2s ease-in-out',
          },
          contained: {
            boxShadow: isLight 
              ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              : 'none',
            '&:hover': {
              boxShadow: isLight 
                ? '0 4px 12px 0 rgba(99, 102, 241, 0.25)'
                : '0 4px 12px 0 rgba(129, 140, 248, 0.2)',
              transform: 'translateY(-1px)',
            },
          },
          outlined: {
            borderColor: colors.border,
            '&:hover': {
              borderColor: colors.accent,
              backgroundColor: alpha(colors.accent, 0.04),
            },
          },
          text: {
            '&:hover': {
              backgroundColor: alpha(colors.accent, 0.06),
            },
          },
          sizeSmall: {
            padding: '6px 14px',
            fontSize: '0.8125rem',
          },
          sizeLarge: {
            padding: '12px 28px',
            fontSize: '0.9375rem',
          },
        },
        defaultProps: {
          disableElevation: true,
        },
      },
      
      // Paper - Clean white cards with subtle border
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.borderLight}`,
            boxShadow: isLight 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)'
              : 'none',
          },
          elevation0: {
            boxShadow: 'none',
          },
          elevation1: {
            boxShadow: isLight 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.04)'
              : 'none',
          },
          elevation2: {
            boxShadow: isLight 
              ? '0 2px 8px 0 rgba(0, 0, 0, 0.06)'
              : '0 2px 8px 0 rgba(0, 0, 0, 0.2)',
          },
        },
      },
      
      // Cards - Generous padding, clean borders
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 14,
            boxShadow: isLight 
              ? '0 1px 3px 0 rgba(0, 0, 0, 0.04)'
              : 'none',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: colors.borderHover,
              boxShadow: isLight 
                ? '0 4px 16px 0 rgba(0, 0, 0, 0.06)'
                : '0 4px 16px 0 rgba(0, 0, 0, 0.15)',
            },
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 20,
            '&:last-child': {
              paddingBottom: 20,
            },
          },
        },
      },
      
      // Text Fields - Clean, modern inputs
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              backgroundColor: isLight ? colors.bgCard : colors.bgSecondary,
              borderRadius: 10,
              transition: 'all 0.2s ease-in-out',
              '& fieldset': {
                borderColor: colors.border,
                borderWidth: 1,
              },
              '&:hover fieldset': {
                borderColor: colors.borderHover,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.accent,
                borderWidth: 2,
              },
            },
            '& .MuiInputLabel-root': {
              color: colors.textSecondary,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
          },
          input: {
            padding: '12px 16px',
          },
        },
      },
      
      // Select - Consistent with text fields
      MuiSelect: {
        styleOverrides: {
          root: {
            backgroundColor: isLight ? colors.bgCard : colors.bgSecondary,
          },
        },
      },
      
      // Chips - Soft colors, rounded
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.75rem',
            height: 26,
          },
          filled: {
            backgroundColor: colors.bgTertiary,
            '&:hover': {
              backgroundColor: colors.border,
            },
          },
          outlined: {
            borderColor: colors.border,
          },
          sizeSmall: {
            height: 22,
            fontSize: '0.6875rem',
          },
        },
      },
      
      // Dialogs - Clean modal styling
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.bgCard,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 16,
            boxShadow: isLight 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '24px 24px 16px',
            fontSize: '1.125rem',
            fontWeight: 600,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '8px 24px 24px',
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '16px 24px 24px',
            gap: 12,
          },
        },
      },
      
      // Tabs - Clean, subtle active state
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 44,
            padding: '10px 20px',
            color: colors.textSecondary,
            '&.Mui-selected': {
              color: colors.accent,
              fontWeight: 600,
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 2,
            borderRadius: 1,
          },
        },
      },
      
      // Icon Buttons - Subtle hover
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(colors.accent, 0.08),
            },
          },
          sizeSmall: {
            padding: 6,
          },
        },
      },
      
      // Tooltips - Clean, minimal
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: isLight ? colors.text : colors.bgCard,
            color: isLight ? '#ffffff' : colors.text,
            border: isLight ? 'none' : `1px solid ${colors.border}`,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          arrow: {
            color: isLight ? colors.text : colors.bgCard,
          },
        },
      },
      
      // AppBar - Clean header
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.bgCard,
            borderBottom: `1px solid ${colors.border}`,
            boxShadow: 'none',
          },
        },
      },
      
      // Drawer/Sidebar
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: colors.bgSecondary,
            borderRight: `1px solid ${colors.border}`,
          },
        },
      },
      
      // List items
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            marginBottom: 2,
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '10px 12px',
            '&:hover': {
              backgroundColor: alpha(colors.accent, 0.06),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(colors.accent, 0.1),
              '&:hover': {
                backgroundColor: alpha(colors.accent, 0.12),
              },
            },
          },
        },
      },
      
      // Alerts - Soft semantic colors
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            border: '1px solid',
          },
          standardSuccess: {
            backgroundColor: colors.accentGreenBg,
            borderColor: alpha(colors.accentGreen, 0.2),
            color: colors.accentGreen,
          },
          standardWarning: {
            backgroundColor: colors.accentYellowBg,
            borderColor: alpha(colors.accentYellow, 0.2),
            color: isLight ? '#92400e' : colors.accentYellow,
          },
          standardError: {
            backgroundColor: colors.accentRedBg,
            borderColor: alpha(colors.accentRed, 0.2),
            color: colors.accentRed,
          },
          standardInfo: {
            backgroundColor: colors.accentBlueBg,
            borderColor: alpha(colors.accentBlue, 0.2),
            color: colors.accentBlue,
          },
        },
      },
      
      // Linear Progress - Smooth progress bars
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 6,
            backgroundColor: colors.bgTertiary,
          },
          bar: {
            borderRadius: 4,
          },
        },
      },
      
      // Circular Progress
      MuiCircularProgress: {
        styleOverrides: {
          root: {
            color: colors.accent,
          },
        },
      },
      
      // Divider
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: colors.border,
          },
        },
      },
      
      // Avatar
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: colors.accentLight,
            color: colors.accent,
            fontWeight: 600,
          },
        },
      },
      
      // Badge
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 600,
            fontSize: '0.6875rem',
          },
        },
      },
      
      // Menu
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            boxShadow: isLight 
              ? '0 10px 40px -10px rgba(0, 0, 0, 0.15)'
              : '0 10px 40px -10px rgba(0, 0, 0, 0.4)',
            marginTop: 4,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            margin: '2px 6px',
            padding: '8px 12px',
            fontSize: '0.875rem',
            '&:hover': {
              backgroundColor: alpha(colors.accent, 0.06),
            },
            '&.Mui-selected': {
              backgroundColor: alpha(colors.accent, 0.1),
              '&:hover': {
                backgroundColor: alpha(colors.accent, 0.12),
              },
            },
          },
        },
      },
      
      // Skeleton
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: colors.bgTertiary,
          },
        },
      },
      
      // Table
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: colors.border,
            padding: '14px 16px',
          },
          head: {
            fontWeight: 600,
            backgroundColor: colors.bgSecondary,
            color: colors.textSecondary,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: alpha(colors.accent, 0.02),
            },
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
export default lightTheme;
