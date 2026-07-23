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
  Divider,
} from '@mui/material';
import type { SimulateResponse } from '../types';
import { buildDaySheets, STATUS_ORDER } from './eldLogic';
import { STATUS_LABELS } from './format';
import { STATUS_COLORS } from '../theme/theme';
import EldCanvas from './EldCanvas';

interface Props {
  data: SimulateResponse;
}

/** A labeled field mimicking the blank lines on the paper log header. */
function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'text.primary',
          pb: 0.25,
          minHeight: 22,
          fontWeight: 600,
        }}
      >
        {value || ' '}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default function EldLogViewer({ data }: Props) {
  const sheets = useMemo(() => buildDaySheets(data.timeline_events), [data]);
  const [tab, setTab] = useState(0);

  if (sheets.length === 0) return null;
  const active = sheets[Math.min(tab, sheets.length - 1)];

  const { current, dropoff } = data.waypoints;
  const cycleUsedStart = data.trip_summary.cycle_used_start;

  // 70h/8-day recap for THIS sheet:
  //   used-through-today = starting cycle + on-duty accrued up to & incl. today
  const onDutyThroughToday =
    cycleUsedStart +
    sheets
      .slice(0, active.dayIndex + 1)
      .reduce((acc, s) => acc + s.onDutyToday, 0);
  const availableTomorrow = Math.max(0, 70 - onDutyThroughToday);

  return (
    <Card>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6">Driver's Daily Log</Typography>
        <Typography variant="body2" color="text.secondary">
          FMCSA record of duty status — {sheets.length} day
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
        {/* ---- Header block (mirrors the paper log) ---- */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <HeaderField label="Total Miles Driving Today" value={Math.round(active.totalMiles).toLocaleString()} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <HeaderField label="Day" value={`Day ${active.dayIndex + 1} of ${sheets.length}`} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <HeaderField label="Carrier / Office" value="TruckLogic Simulation" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <HeaderField label="From" value={active.dayIndex === 0 ? current.label : 'En route'} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <HeaderField label="To" value={active.dayIndex === sheets.length - 1 ? dropoff.label : 'En route'} />
          </Grid>
        </Grid>

        {/* ---- The 24-hour grid ---- */}
        <EldCanvas segments={active.segments} totals={active.totals} />

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
                    <Typography variant="body2">{STATUS_LABELS[status]}</Typography>
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
                    {STATUS_ORDER.reduce((acc, s) => acc + active.totals[s], 0).toFixed(2)} h
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            {/* ---- 70h/8-day recap ---- */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Recap · 70 hr / 8 day
            </Typography>
            <Stack spacing={0.75}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  On-duty hours today (lines 3 &amp; 4)
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {active.onDutyToday.toFixed(2)} h
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total on-duty last 8 days
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {onDutyThroughToday.toFixed(2)} h
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Available tomorrow (70 − used)
                </Typography>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {availableTomorrow.toFixed(2)} h
                </Typography>
              </Stack>
            </Stack>
          </Grid>

          {/* Remarks table */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle2" gutterBottom>
              Remarks — Location of Each Duty Status Change
            </Typography>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                maxHeight: 300,
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
