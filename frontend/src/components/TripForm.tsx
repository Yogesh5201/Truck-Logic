import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  TextField,
  Typography,
  Stack,
  Chip,
} from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FlagIcon from '@mui/icons-material/Flag';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RouteIcon from '@mui/icons-material/Route';
import { useTripStore } from '../store/tripStore';

interface FieldErrors {
  current_location?: string;
  pickup_location?: string;
  dropoff_location?: string;
  current_cycle_used?: string;
}

// Form fields are held as strings while editing; converted on submit.
interface FormState {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: string;
}

// A couple of ready-made trips so evaluators can try the app in one click.
const PRESETS: Array<{ label: string; value: FormState }> = [
  {
    label: 'Chicago → Dallas',
    value: {
      current_location: 'Chicago, IL',
      pickup_location: 'Kansas City, MO',
      dropoff_location: 'Dallas, TX',
      current_cycle_used: '10',
    },
  },
  {
    label: 'Cross-country (LA → NY)',
    value: {
      current_location: 'Los Angeles, CA',
      pickup_location: 'Denver, CO',
      dropoff_location: 'New York, NY',
      current_cycle_used: '8',
    },
  },
  {
    label: 'Cycle nearly full (68 h)',
    value: {
      current_location: 'Houston, TX',
      pickup_location: 'Oklahoma City, OK',
      dropoff_location: 'Denver, CO',
      current_cycle_used: '68',
    },
  },
];

export default function TripForm() {
  const { runSimulation, loading } = useTripStore();

  const [form, setForm] = useState<FormState>({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: '0',
  });
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.current_location.trim()) e.current_location = 'Required';
    if (!form.pickup_location.trim()) e.pickup_location = 'Required';
    if (!form.dropoff_location.trim()) e.dropoff_location = 'Required';
    const cycle = Number(form.current_cycle_used);
    if (Number.isNaN(cycle) || cycle < 0 || cycle > 70) {
      e.current_cycle_used = 'Enter 0–70 hours';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!validate()) return;
    runSimulation({
      ...form,
      current_cycle_used: Number(form.current_cycle_used),
    });
  };

  const applyPreset = (value: FormState) => {
    setForm(value);
    setErrors({});
  };

  return (
    <Card sx={{ position: 'sticky', top: 24 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
          <RouteIcon color="primary" />
          <Typography variant="h6">Plan a Trip</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Enter trip details to generate an HOS-compliant route and ELD logs.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Current location"
                placeholder="e.g. Chicago, IL"
                value={form.current_location}
                onChange={(e) => update('current_location', e.target.value)}
                error={!!errors.current_location}
                helperText={errors.current_location}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PlaceIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Pickup location"
                placeholder="e.g. Kansas City, MO"
                value={form.pickup_location}
                onChange={(e) => update('pickup_location', e.target.value)}
                error={!!errors.pickup_location}
                helperText={errors.pickup_location}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocalShippingIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Dropoff location"
                placeholder="e.g. Dallas, TX"
                value={form.dropoff_location}
                onChange={(e) => update('dropoff_location', e.target.value)}
                error={!!errors.dropoff_location}
                helperText={errors.dropoff_location}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FlagIcon fontSize="small" sx={{ color: '#dc2626' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Current cycle used"
                value={form.current_cycle_used}
                onChange={(e) => update('current_cycle_used', e.target.value)}
                error={!!errors.current_cycle_used}
                helperText={errors.current_cycle_used ?? '70-hour / 8-day cycle'}
                inputProps={{ min: 0, max: 70, step: 0.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScheduleIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">hrs</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 2.5, py: 1.2 }}
          >
            {loading ? 'Simulating…' : 'Generate Route & Logs'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
          Quick presets
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
          {PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              size="small"
              variant="outlined"
              onClick={() => applyPreset(p.value)}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
