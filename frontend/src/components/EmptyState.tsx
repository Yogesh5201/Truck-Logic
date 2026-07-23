import { Box, Typography, Stack, useTheme } from '@mui/material';
import ExploreRoundedIcon from '@mui/icons-material/ExploreRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

/** Attractive empty state shown before the first simulation is run. */
export default function EmptyState() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const features = [
    { icon: <MapRoundedIcon />, label: 'Live route map' },
    { icon: <DescriptionRoundedIcon />, label: 'FMCSA ELD logs' },
    { icon: <VerifiedRoundedIcon />, label: 'HOS compliant' },
  ];

  return (
    <Box
      sx={{
        borderRadius: 4,
        border: `1px dashed ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        p: { xs: 4, sm: 8 },
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 460,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* soft radial accent */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(99,102,241,0.20), transparent 70%)'
            : 'radial-gradient(circle, rgba(99,102,241,0.14), transparent 70%)',
          filter: 'blur(8px)',
        }}
      />

      <Box
        sx={{
          width: 76,
          height: 76,
          borderRadius: '22px',
          display: 'grid',
          placeItems: 'center',
          mb: 3,
          color: '#fff',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 12px 30px rgba(99,102,241,0.4)',
          animation: 'floaty 3.5s ease-in-out infinite',
          '@keyframes floaty': {
            '0%,100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-8px)' },
          },
        }}
      >
        <ExploreRoundedIcon sx={{ fontSize: 38 }} />
      </Box>

      <Typography variant="h5" fontWeight={800} gutterBottom>
        Plan your first trip
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420, mb: 3 }}>
        Enter a current location, pickup, and dropoff — TruckLogic computes an
        Hours-of-Service compliant route and draws your daily ELD log sheets.
      </Typography>

      <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center" useFlexGap>
        {features.map((f) => (
          <Stack
            key={f.label}
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              color: 'text.secondary',
              '& svg': { fontSize: 18, color: 'primary.main' },
            }}
          >
            {f.icon}
            <Typography variant="caption" fontWeight={600}>
              {f.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
