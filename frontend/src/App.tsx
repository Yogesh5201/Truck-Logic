import { lazy, Suspense } from 'react';
import { Box, Container, Grid, Stack, Fade } from '@mui/material';
import { useTripStore } from './store/tripStore';
import Header from './components/Header';
import TripForm from './components/TripForm';
import TripSummary from './components/TripSummary';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import ResultsSkeleton from './components/ResultsSkeleton';

// Leaflet + the canvas ELD are the heaviest parts of the bundle; load them
// only once there is a result to render.
const TripMap = lazy(() => import('./components/TripMap'));
const EldLogViewer = lazy(() => import('./components/EldLogViewer'));

export default function App() {
  const { result, loading, error, lastRequest, runSimulation } = useTripStore();

  const retry = () => {
    if (lastRequest) runSimulation(lastRequest);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header />

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
        <Grid container spacing={{ xs: 2.5, md: 3 }}>
          {/* Left: input form */}
          <Grid item xs={12} md={4} lg={3}>
            <TripForm />
          </Grid>

          {/* Right: results */}
          <Grid item xs={12} md={8} lg={9}>
            {loading && <ResultsSkeleton />}

            {!loading && error && (
              <ErrorState message={error} onRetry={retry} canRetry={!!lastRequest} />
            )}

            {!loading && !error && !result && <EmptyState />}

            {!loading && !error && result && (
              <Fade in timeout={400}>
                <Stack spacing={{ xs: 2.5, md: 3 }}>
                  <TripSummary summary={result.trip_summary} />
                  <Suspense fallback={<ResultsSkeleton />}>
                    <TripMap data={result} />
                    <EldLogViewer data={result} />
                  </Suspense>
                </Stack>
              </Fade>
            )}
          </Grid>
        </Grid>
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          mt: 4,
          textAlign: 'center',
          color: 'text.secondary',
          borderTop: '1px solid',
          borderColor: 'divider',
          fontSize: 13,
        }}
      >
        TruckLogic · Simulated HOS routing for evaluation · Powered by GraphHopper
      </Box>
    </Box>
  );
}
