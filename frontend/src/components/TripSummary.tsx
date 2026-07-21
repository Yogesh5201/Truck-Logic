import { Card, CardContent, Grid, Stack, Typography, Box } from '@mui/material';
import StraightenIcon from '@mui/icons-material/Straighten';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import HotelIcon from '@mui/icons-material/Hotel';
import DescriptionIcon from '@mui/icons-material/Description';
import SpeedIcon from '@mui/icons-material/Speed';
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
  const metrics: Metric[] = [
    {
      icon: <StraightenIcon />,
      label: 'Total Distance',
      value: `${summary.total_distance_mi.toLocaleString()} mi`,
      color: '#0f766e',
    },
    {
      icon: <AccessTimeIcon />,
      label: 'Total Trip Time',
      value: formatDuration(summary.total_duration_hr),
      sub: `${summary.driving_hr.toFixed(1)}h driving`,
      color: '#0ea5e9',
    },
    {
      icon: <SpeedIcon />,
      label: 'Cycle Available',
      value: `${summary.cycle_available_start.toFixed(1)}h`,
      sub: `${summary.cycle_used_start.toFixed(1)}h used of 70`,
      color: '#f59e0b',
    },
    {
      icon: <HotelIcon />,
      label: 'Rest Stops',
      value: `${summary.num_daily_resets + summary.num_cycle_restarts}`,
      sub: `${summary.num_breaks} short breaks`,
      color: '#6366f1',
    },
    {
      icon: <LocalGasStationIcon />,
      label: 'Fuel Stops',
      value: `${summary.num_fuel_stops}`,
      sub: 'every 1,000 mi',
      color: '#7c3aed',
    },
    {
      icon: <DescriptionIcon />,
      label: 'Log Sheets',
      value: `${summary.num_log_sheets}`,
      sub: '24h ELD grids',
      color: '#dc2626',
    },
  ];

  return (
    <Grid container spacing={2}>
      {metrics.map((m) => (
        <Grid item xs={6} sm={4} md={2} key={m.label}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack spacing={1}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: m.color,
                    bgcolor: `${m.color}15`,
                  }}
                >
                  {m.icon}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ lineHeight: 1.1 }}>
                    {m.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.label}
                  </Typography>
                  {m.sub && (
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ color: m.color, fontWeight: 600 }}
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
