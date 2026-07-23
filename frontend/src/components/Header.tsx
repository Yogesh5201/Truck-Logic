import { AppBar, Toolbar, Box, IconButton, Tooltip, useTheme } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { useColorMode } from '../theme/ColorModeProvider';

/** App header: logo and the light/dark toggle. */
export default function Header() {
  const { mode, toggle } = useColorMode();
  const theme = useTheme();
  const isDark = mode === 'dark';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: isDark ? 'rgba(15,17,23,0.8)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'saturate(180%) blur(12px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
        {/* Logo — takes all available space so the toggle sits at the far right */}
        <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src={isDark ? '/logo-dark.png' : '/logo-light.png'}
            alt="TruckLogic logo"
            sx={{
              height: { xs: 52, sm: 58 },
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              transition: 'opacity 0.2s ease',
            }}
          />
        </Box>

        {/* Theme toggle */}
        <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} arrow>
          <IconButton
            onClick={toggle}
            aria-label="Toggle color mode"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              transition: 'transform 150ms ease',
              '&:hover': { transform: 'rotate(-12deg)' },
            }}
          >
            {isDark ? (
              <LightModeRoundedIcon fontSize="small" />
            ) : (
              <DarkModeRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
