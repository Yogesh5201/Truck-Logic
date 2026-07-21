import { useMemo, useState } from 'react';
import {
  Card,
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Stack,
} from '@mui/material';
import type { SimulateResponse } from '../types';
import { buildDaySheets, STATUS_ORDER } from './eldLogic';
import { STATUS_LABELS } from './format';
import { STATUS_COLORS } from '../theme/theme';
import EldCanvas from './EldCanvas';

interface Props {
  data: SimulateResponse;
}

export default function EldLogViewer({ data }: Props) {
  const sheets = useMemo(
    () => buildDaySheets(data.timeline_events),
    [data],
  );
  const [tab, setTab] = useState(0);

  if (sheets.length === 0) return null;
  const active = sheets[Math.min(tab, sheets.length - 1)];

  return (
    <Card>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6">Daily Log Sheets</Typography>
        <Typography variant="body2" color="text.secondary">
          FMCSA driver's daily log — {sheets.length} day
          {sheets.length > 1 ? 's' : ''} required for this trip
        </Typography>
      </Box>

      {sheets.length > 1 && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {sheets.map((s) => (
            <Tab key={s.dayIndex} label={`Day ${s.dayIndex + 1}`} />
          ))}
        </Tabs>
      )}

      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <EldCanvas segments={active.segments} />

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Daily status totals */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Hours by Status
            </Typography>
            <Stack spacing={1}>
              {STATUS_ORDER.map((status) => (
                <Stack
                  key={status}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '3px',
                        bgcolor: STATUS_COLORS[status],
                      }}
                    />
                    <Typography variant="body2">
                      {STATUS_LABELS[status]}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" fontWeight={600}>
                    {active.totals[status].toFixed(2)} h
                  </Typography>
                </Stack>
              ))}
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" fontWeight={700}>
                    Total
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {STATUS_ORDER.reduce(
                      (acc, s) => acc + active.totals[s],
                      0,
                    ).toFixed(2)}{' '}
                    h
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Grid>

          {/* Remarks table */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle2" gutterBottom>
              Remarks (Duty Status Changes)
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                maxHeight: 260,
                overflow: 'auto',
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Location</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Remark</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {active.remarks.map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {r.time}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[r.status]}
                          sx={{
                            bgcolor: `${STATUS_COLORS[r.status]}20`,
                            color: STATUS_COLORS[r.status],
                            fontWeight: 600,
                            height: 22,
                          }}
                        />
                      </TableCell>
                      <TableCell>{r.location || '—'}</TableCell>
                      <TableCell>{r.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Card>
  );
}
