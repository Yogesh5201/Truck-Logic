import { createTheme } from '@mui/material/styles';

/**
 * Application theme. A calm slate/indigo palette with a warm amber accent —
 * reads as a professional logistics dashboard rather than a generic MUI app.
 * Shared status colors are exported so the map markers and ELD grid stay
 * visually consistent with the rest of the UI.
 */

// Duty-status accent colors, reused by the ELD canvas and legends.
export const STATUS_COLORS = {
  OFF_DUTY: '#94a3b8', // slate-400
  SLEEPER_BERTH: '#6366f1', // indigo-500
  DRIVING: '#0ea5e9', // sky-500
  ON_DUTY: '#f59e0b', // amber-500
} as const;

// Event-type marker colors for the map.
export const EVENT_COLORS = {
  START: '#0f766e', // teal-700
  PICKUP: '#f59e0b', // amber-500
  DROPOFF: '#dc2626', // red-600
  FUEL: '#7c3aed', // violet-600
  REST: '#6366f1', // indigo-500
  BREAK: '#94a3b8', // slate-400
} as const;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f766e', dark: '#115e59', light: '#14b8a6' },
    secondary: { main: '#f59e0b' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #e2e8f0' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});

export default theme;
