import { Card, CardContent, Grid, Stack, Typography, Box, useTheme } from '@mui/material';
import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LocalGasStationRoundedIcon from '@mui/icons-material/LocalGasStationRounded';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import type { TripSummary as Summary } from '../types';
import { formatDuration } from './format';

interface Props {
  summary: Summary;
}

interface Metric {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

export default function TripSummary({ summary }: Props) {
  const theme = useTheme();

  const metrics: Metric[] = [
    {
      icon: <StraightenRoundedIcon />,
      label: 'Total distance',
      value: `${summary.total_distance_mi.toLocaleString()} mi`,
      color: '#6366f1',
    },
    {
      icon: <AccessTimeRoundedIcon />,
      label: 'Total trip time',
      value: formatDuration(summary.total_duration_hr),
      sub: `${summary.driving_hr.toFixed(1)}h driving`,
      color: '#0ea5e9',
    },
    {
      icon: <SpeedRoundedIcon />,
      label: 'Cycle available',
      value: `${summary.cycle_available_start.toFixed(1)}h`,
      sub: `${summary.cycle_used_start.toFixed(1)}h of 70 used`,
      color: '#f59e0b',
    },
    {
      icon: <HotelRoundedIcon />,
      label: 'Rest stops',
      value: `${summary.num_daily_resets + summary.num_cycle_restarts}`,
      sub: `${summary.num_breaks} short breaks`,
      color: '#8b5cf6',
    },
    {
      icon: <LocalGasStationRoundedIcon />,
      label: 'Fuel stops',
      value: `${summary.num_fuel_stops}`,
      sub: 'every 1,000 mi',
      color: '#10b981',
    },
    {
      icon: <DescriptionRoundedIcon />,
      label: 'Log sheets',
      value: `${summary.num_log_sheets}`,
      sub: '24h ELD grids',
      color: '#ef4444',
    },
  ];

  return (
    <Grid container spacing={2}>
      {metrics.map((m, i) => (
        <Grid item xs={6} sm={4} lg={2} key={m.label}>
          <Card
            sx={{
              height: '100%',
              transition: 'transform 180ms ease, box-shadow 220ms ease, border-color 180ms ease',
              animation: 'fadeUp 420ms ease both',
              animationDelay: `${i * 55}ms`,
              '@keyframes fadeUp': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
              '&:hover': {
                transform: 'translateY(-3px)',
                borderColor: m.color,
                boxShadow:
                  theme.palette.mode === 'dark'
                    ? '0 10px 30px rgba(0,0,0,0.45)'
                    : '0 10px 30px rgba(15,23,42,0.10)',
              },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack spacing={1.25}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: m.color,
                    bgcolor: `${m.color}18`,
                  }}
                >
                  {m.icon}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ lineHeight: 1.05, fontWeight: 800 }}>
                    {m.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {m.label}
                  </Typography>
                  {m.sub && (
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ color: m.color, fontWeight: 600, mt: 0.25 }}
                    >
                      {m.sub}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
