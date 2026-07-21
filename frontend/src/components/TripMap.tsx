import { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, Box, Typography, Stack, Chip } from '@mui/material';
import type { SimulateResponse, TimelineEvent } from '../types';
import { EVENT_META, formatDayTime } from './format';

interface Props {
  data: SimulateResponse;
}

/** Build a small circular SVG divIcon in the given color with a glyph. */
function makeIcon(color: string, glyph: string, size = 30): L.DivIcon {
  return L.divIcon({
    className: 'leaflet-div-icon',
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
        background:${color};transform:rotate(45deg);
        box-shadow:0 2px 6px rgba(0,0,0,.35);
        border:2px solid #fff;display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(-45deg);color:#fff;font-size:13px;font-weight:700;
          font-family:Inter,sans-serif;">${glyph}</span>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Event types that deserve a distinct marker on the map.
const MARKER_GLYPHS: Record<string, string> = {
  FUEL: '⛽',
  BREAK_30MIN: 'B',
  DAILY_RESET_10H: '🛌',
  CYCLE_RESTART_34H: '🛌',
};

/** Imperatively fit the map to the route bounds whenever the route changes. */
function FitBounds({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();
  useMemo(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

export default function TripMap({ data }: Props) {
  // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
  const routeLatLngs = useMemo<L.LatLngExpression[]>(
    () =>
      data.route_geometry.features[0]?.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon] as L.LatLngExpression,
      ) ?? [],
    [data],
  );

  const { current, pickup, dropoff } = data.waypoints;

  // Stops requiring their own marker (fuel + rests), taken from the timeline.
  const stopEvents = useMemo<TimelineEvent[]>(
    () =>
      data.timeline_events.filter((e) =>
        ['FUEL', 'BREAK_30MIN', 'DAILY_RESET_10H', 'CYCLE_RESTART_34H'].includes(
          e.event_type,
        ),
      ),
    [data],
  );

  const startIcon = makeIcon(EVENT_META.PRE_TRIP.color, 'S');
  const pickupIcon = makeIcon(EVENT_META.PICKUP.color, 'P');
  const dropoffIcon = makeIcon(EVENT_META.DROPOFF.color, 'D');

  const center: L.LatLngExpression =
    routeLatLngs[Math.floor(routeLatLngs.length / 2)] ?? [39.8, -98.5];

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6">Route Map</Typography>
        <Typography variant="body2" color="text.secondary">
          HGV-optimized route with all required stops
        </Typography>
      </Box>

      <Box sx={{ height: { xs: 360, md: 460 }, width: '100%' }}>
        <MapContainer
          center={center}
          zoom={5}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {routeLatLngs.length > 1 && (
            <>
              <Polyline
                positions={routeLatLngs}
                pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.85 }}
              />
              <FitBounds positions={routeLatLngs} />
            </>
          )}

          {/* Origin / Pickup / Dropoff */}
          <Marker position={[current.coord[1], current.coord[0]]} icon={startIcon}>
            <Popup>
              <strong>Start</strong>
              <br />
              {current.label}
            </Popup>
          </Marker>
          <Marker position={[pickup.coord[1], pickup.coord[0]]} icon={pickupIcon}>
            <Popup>
              <strong>Pickup</strong>
              <br />
              {pickup.label}
            </Popup>
          </Marker>
          <Marker position={[dropoff.coord[1], dropoff.coord[0]]} icon={dropoffIcon}>
            <Popup>
              <strong>Dropoff</strong>
              <br />
              {dropoff.label}
            </Popup>
          </Marker>

          {/* Fuel + rest stops */}
          {stopEvents.map((e, i) => {
            const meta = EVENT_META[e.event_type];
            const icon = makeIcon(meta.color, MARKER_GLYPHS[e.event_type] ?? '•', 26);
            return (
              <Marker
                key={`${e.event_type}-${i}`}
                position={[e.start_coord[1], e.start_coord[0]]}
                icon={icon}
              >
                <Popup>
                  <strong>{meta.label}</strong>
                  <br />
                  {formatDayTime(e.start_hr)}
                  {e.location_label ? (
                    <>
                      <br />
                      {e.location_label}
                    </>
                  ) : null}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Box>

      {/* Legend */}
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}
      >
        {[
          { c: EVENT_META.PRE_TRIP.color, l: 'Start' },
          { c: EVENT_META.PICKUP.color, l: 'Pickup' },
          { c: EVENT_META.DROPOFF.color, l: 'Dropoff' },
          { c: EVENT_META.FUEL.color, l: 'Fuel' },
          { c: EVENT_META.DAILY_RESET_10H.color, l: 'Rest / Restart' },
          { c: EVENT_META.BREAK_30MIN.color, l: 'Break' },
        ].map((item) => (
          <Chip
            key={item.l}
            size="small"
            label={item.l}
            sx={{
              bgcolor: `${item.c}18`,
              color: item.c,
              fontWeight: 600,
              border: `1px solid ${item.c}44`,
            }}
          />
        ))}
      </Stack>
    </Card>
  );
}
