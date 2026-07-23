import { AppBar, Toolbar, Box, Typography, IconButton, Tooltip, Chip, useTheme } from '@mui/material';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import { useColorMode } from '../theme/ColorModeProvider';

/** App header: brand mark, compliance badge, and the light/dark toggle. */
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
      <Toolbar sx={{ gap: 1.5, minHeight: { xs: 60, sm: 68 } }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
          }}
        >
          <LocalShippingRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            TruckLogic
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: 'none', sm: 'block' }, lineHeight: 1 }}
          >
            Route &amp; ELD Log Planner
          </Typography>
        </Box>

        <Chip
          label="FMCSA · 70h / 8-day"
          size="small"
          variant="outlined"
          sx={{
            display: { xs: 'none', md: 'flex' },
            fontWeight: 600,
            color: 'text.secondary',
            borderColor: 'divider',
          }}
        />

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
