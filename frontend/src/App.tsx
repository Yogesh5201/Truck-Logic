import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Box,
  Alert,
  Stack,
  CircularProgress,
  Paper,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MapIcon from '@mui/icons-material/Map';
import { useTripStore } from './store/tripStore';
import TripForm from './components/TripForm';
import TripSummary from './components/TripSummary';
import TripMap from './components/TripMap';
import EldLogViewer from './components/EldLogViewer';

function EmptyState() {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 6,
        textAlign: 'center',
        borderStyle: 'dashed',
        color: 'text.secondary',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 420,
      }}
    >
      <MapIcon sx={{ fontSize: 64, color: 'divider', mb: 2 }} />
      <Typography variant="h6" gutterBottom color="text.primary">
        Ready to plan your route
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 360 }}>
        Enter your current location, pickup, dropoff, and current cycle hours —
        we'll compute an HOS-compliant route and draw your ELD daily logs.
      </Typography>
    </Paper>
  );
}

export default function App() {
  const { result, loading, error } = useTripStore();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar>
          <LocalShippingIcon sx={{ mr: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
            TruckLogic
            <Typography
              component="span"
              variant="body2"
              sx={{ ml: 1.5, opacity: 0.75, fontWeight: 400 }}
            >
              Route &amp; ELD Log Planner
            </Typography>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            FMCSA 70h / 8-day · Property-carrying
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Left: input form */}
          <Grid item xs={12} md={4} lg={3}>
            <TripForm />
          </Grid>

          {/* Right: results */}
          <Grid item xs={12} md={8} lg={9}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading && (
              <Paper
                variant="outlined"
                sx={{
                  p: 6,
                  minHeight: 420,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress />
                <Typography sx={{ mt: 2 }} color="text.secondary">
                  Computing HOS-compliant route…
                </Typography>
              </Paper>
            )}

            {!loading && !result && !error && <EmptyState />}

            {!loading && result && (
              <Stack spacing={3}>
                <TripSummary summary={result.trip_summary} />
                <TripMap data={result} />
                <EldLogViewer data={result} />
              </Stack>
            )}
          </Grid>
        </Grid>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          textAlign: 'center',
          color: 'text.secondary',
          borderTop: '1px solid',
          borderColor: 'divider',
          mt: 4,
        }}
      >
        <Typography variant="caption">
          TruckLogic — Simulated HOS routing for evaluation purposes. Not for
          operational compliance use.
        </Typography>
      </Box>
    </Box>
  );
}
