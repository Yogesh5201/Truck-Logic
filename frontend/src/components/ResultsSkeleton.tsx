import { Card, CardContent, Box, Grid, Skeleton, Stack } from '@mui/material';

/**
 * Progressive skeleton loader that mirrors the results layout (summary cards +
 * map + log sheet), giving a smooth perceived-performance experience instead
 * of a bare spinner while GraphHopper routes are fetched.
 */
export default function ResultsSkeleton() {
  return (
    <Stack spacing={3}>
      {/* Summary metric cards */}
      <Grid container spacing={2}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Grid item xs={6} sm={4} lg={2} key={i}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: 2.5, mb: 1.5 }} />
                <Skeleton variant="text" width="70%" height={30} />
                <Skeleton variant="text" width="55%" />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Map */}
      <Card sx={{ overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width={140} height={26} />
          <Skeleton variant="text" width={220} />
        </Box>
        <Skeleton variant="rectangular" height={440} animation="wave" />
      </Card>

      {/* Log sheet */}
      <Card>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width={180} height={26} />
          <Skeleton variant="text" width={260} />
        </Box>
        <Box sx={{ px: 3, pb: 3 }}>
          <Skeleton variant="rounded" height={260} animation="wave" />
        </Box>
      </Card>
    </Stack>
  );
}
