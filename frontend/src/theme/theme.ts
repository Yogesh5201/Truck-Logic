import { createTheme, type Theme } from '@mui/material/styles';

/**
 * Premium design system for TruckLogic.
 *
 * A single source of truth for both light and dark palettes plus the shared
 * status / event colors reused by the map markers and the ELD grid. The look
 * targets the calm, high-contrast, generously-spaced feel of tools like
 * Linear / Vercel / Stripe: one confident indigo accent, neutral slate
 * surfaces, restrained shadows, and a consistent 10px radius.
 */

export type ColorMode = 'light' | 'dark';

// Accent — a single indigo used consistently across the app.
const ACCENT = '#6366f1';
const ACCENT_HOVER = '#4f46e5';

// Duty-status colors (shared by ELD canvas, legends, chips). Tuned to stay
// legible on both light and dark surfaces.
export const STATUS_COLORS = {
  OFF_DUTY: '#64748b', // slate
  SLEEPER_BERTH: '#8b5cf6', // violet
  DRIVING: '#6366f1', // indigo (accent)
  ON_DUTY: '#f59e0b', // amber
} as const;

// Event-type marker colors for the map.
export const EVENT_COLORS = {
  START: '#10b981', // emerald
  PICKUP: '#f59e0b', // amber
  DROPOFF: '#ef4444', // red
  FUEL: '#8b5cf6', // violet
  REST: '#6366f1', // indigo
  BREAK: '#64748b', // slate
} as const;

const FONT_STACK =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function baseTokens(mode: ColorMode) {
  const isDark = mode === 'dark';
  return {
    accent: ACCENT,
    surface: isDark ? '#0f1117' : '#f7f8fa',
    paper: isDark ? '#171a21' : '#ffffff',
    paperAlt: isDark ? '#1e222b' : '#f9fafb',
    border: isDark ? '#262b36' : '#e7e9ee',
    textPrimary: isDark ? '#e6e8ee' : '#0f172a',
    textSecondary: isDark ? '#9aa2b1' : '#5b6472',
  };
}

export function buildTheme(mode: ColorMode): Theme {
  const t = baseTokens(mode);
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: ACCENT, dark: ACCENT_HOVER, light: '#818cf8' },
      secondary: { main: '#f59e0b' },
      success: { main: '#10b981' },
      error: { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      background: { default: t.surface, paper: t.paper },
      text: { primary: t.textPrimary, secondary: t.textSecondary },
      divider: t.border,
    },
    typography: {
      fontFamily: FONT_STACK,
      h4: { fontWeight: 700, letterSpacing: '-0.025em' },
      h5: { fontWeight: 700, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700, letterSpacing: '-0.015em' },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600, letterSpacing: '-0.005em' },
      body2: { lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
      overline: { fontWeight: 700, letterSpacing: '0.08em' },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': { boxSizing: 'border-box' },
          body: {
            transition: 'background-color 200ms ease',
            WebkitFontSmoothing: 'antialiased',
          },
          '::selection': {
            background: isDark ? '#3730a3' : '#e0e7ff',
          },
          // Elegant thin scrollbars.
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            background: t.border,
            borderRadius: 8,
            border: `2px solid ${t.paper}`,
          },
          '*::-webkit-scrollbar-thumb:hover': { background: t.textSecondary },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            backgroundColor: t.paper,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 18,
            transition:
              'transform 120ms ease, box-shadow 160ms ease, background-color 160ms ease',
            '&:active': { transform: 'translateY(1px) scale(0.99)' },
          },
          containedPrimary: {
            boxShadow: `0 1px 2px ${isDark ? '#00000066' : '#6366f133'}`,
            '&:hover': {
              boxShadow: `0 6px 18px ${isDark ? '#00000080' : '#6366f140'}`,
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            transition: 'box-shadow 160ms ease, border-color 160ms ease',
            '&.Mui-focused': {
              boxShadow: `0 0 0 4px ${isDark ? '#6366f133' : '#6366f11f'}`,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: isDark ? '#e6e8ee' : '#0f172a',
            color: isDark ? '#0f172a' : '#ffffff',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 8,
            padding: '6px 10px',
          },
          arrow: { color: isDark ? '#e6e8ee' : '#0f172a' },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            minHeight: 44,
          },
        },
      },
    },
  });
}
