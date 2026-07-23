import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Stack,
  InputAdornment,
  Divider,
  CircularProgress,
  useTheme,
} from '@mui/material';
import TripOriginRoundedIcon from '@mui/icons-material/TripOriginRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useTripStore } from '../store/tripStore';
import { useToast } from './ToastProvider';
import LocationAutocomplete from './LocationAutocomplete';

interface FieldErrors {
  current_location?: string;
  pickup_location?: string;
  dropoff_location?: string;
  current_cycle_used?: string;
}

interface FormState {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: string;
}

const PRESETS: Array<{ label: string; hint: string; value: FormState }> = [
  {
    label: 'Chicago → Dallas',
    hint: 'Regional · 1 rest',
    value: {
      current_location: 'Chicago, IL',
      pickup_location: 'Kansas City, MO',
      dropoff_location: 'Dallas, TX',
      current_cycle_used: '10',
    },
  },
  {
    label: 'LA → New York',
    hint: 'Cross-country · multi-day',
    value: {
      current_location: 'Los Angeles, CA',
      pickup_location: 'Denver, CO',
      dropoff_location: 'New York, NY',
      current_cycle_used: '8',
    },
  },
  {
    label: 'Cycle nearly full',
    hint: '68h used · 34h restart',
    value: {
      current_location: 'Houston, TX',
      pickup_location: 'Oklahoma City, OK',
      dropoff_location: 'Denver, CO',
      current_cycle_used: '68',
    },
  },
];

const EMPTY: FormState = {
  current_location: '',
  pickup_location: '',
  dropoff_location: '',
  current_cycle_used: '0',
};

export default function TripForm() {
  const theme = useTheme();
  const { runSimulation, loading } = useTripStore();
  const { notify } = useToast();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});

  const update = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!form.current_location.trim()) e.current_location = 'Required';
    if (!form.pickup_location.trim()) e.pickup_location = 'Required';
    if (!form.dropoff_location.trim()) e.dropoff_location = 'Required';
    const cycle = Number(form.current_cycle_used);
    if (Number.isNaN(cycle) || cycle < 0 || cycle > 70) {
      e.current_cycle_used = 'Enter a value between 0 and 70';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!validate()) {
      notify('Please fix the highlighted fields.', 'warning');
      return;
    }
    const ok = await runSimulation({
      ...form,
      current_cycle_used: Number(form.current_cycle_used),
    });
    if (ok) notify('Route & logs generated successfully.', 'success');
    else {
      const msg = useTripStore.getState().error ?? 'Simulation failed.';
      notify(msg, 'error');
    }
  };

  const applyPreset = (value: FormState) => {
    setForm(value);
    setErrors({});
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' },
  } as const;

  return (
    <Card
      sx={{
        position: { md: 'sticky' },
        top: 88,
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" spacing={1.25} alignItems="center" mb={0.5}>
          <PlaceRoundedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            Plan a trip
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2.5}>
          Enter route details to generate an HOS-compliant plan.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <LocationAutocomplete
              label="Current location"
              placeholder="Start typing a city…"
              value={form.current_location}
              onChange={(v) => update('current_location', v)}
              error={errors.current_location}
              startIcon={<TripOriginRoundedIcon sx={{ fontSize: 18, color: '#10b981' }} />}
            />
            <LocationAutocomplete
              label="Pickup location"
              placeholder="Start typing a city…"
              value={form.pickup_location}
              onChange={(v) => update('pickup_location', v)}
              error={errors.pickup_location}
              startIcon={<Inventory2RoundedIcon sx={{ fontSize: 18, color: '#f59e0b' }} />}
            />
            <LocationAutocomplete
              label="Dropoff location"
              placeholder="Start typing a city…"
              value={form.dropoff_location}
              onChange={(v) => update('dropoff_location', v)}
              error={errors.dropoff_location}
              startIcon={<PlaceRoundedIcon sx={{ fontSize: 18, color: '#ef4444' }} />}
            />
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Current cycle used"
              value={form.current_cycle_used}
              onChange={(e) => update('current_cycle_used', e.target.value)}
              error={!!errors.current_cycle_used}
              helperText={errors.current_cycle_used ?? 'Hours already used in the 70h / 8-day cycle'}
              inputProps={{ min: 0, max: 70, step: 0.5, 'aria-label': 'Current cycle used in hours' }}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScheduleRoundedIcon sx={{ fontSize: 18 }} color="action" />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
              }}
            />
          </Stack>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            endIcon={
              loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <ArrowForwardRoundedIcon />
              )
            }
            sx={{ mt: 3, py: 1.25, fontSize: 15 }}
          >
            {loading ? 'Generating…' : 'Generate route & logs'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>
          <Typography variant="overline" color="text.secondary">
            or try a preset
          </Typography>
        </Divider>

        <Stack spacing={1}>
          {PRESETS.map((p) => (
            <Box
              key={p.label}
              role="button"
              tabIndex={0}
              onClick={() => applyPreset(p.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  applyPreset(p.value);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.25,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                cursor: 'pointer',
                transition: 'all 150ms ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: theme.palette.mode === 'dark' ? '#6366f114' : '#6366f10a',
                  transform: 'translateX(2px)',
                },
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              }}
            >
              <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {p.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {p.hint}
                </Typography>
              </Box>
              <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
