import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, Box, Typography, Stack, Chip, useTheme } from '@mui/material';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import type { SimulateResponse, TimelineEvent } from '../types';
import { useColorMode } from '../theme/ColorModeProvider';
import { EVENT_META, formatDayTime } from './format';

interface Props {
  data: SimulateResponse;
}

// Light + dark tile layers (CARTO basemaps read as far more premium than raw OSM).
const TILES = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attr: '&copy; OpenStreetMap &copy; CARTO',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attr: '&copy; OpenStreetMap &copy; CARTO',
  },
};

/** Build a teardrop SVG divIcon; `pulse` adds an animated ring for key stops. */
function makeIcon(color: string, glyph: string, size = 30, pulse = false): L.DivIcon {
  const ring = pulse
    ? `<span style="position:absolute;inset:0;border-radius:50%;background:${color};
         opacity:0.35;animation:marker-pulse 2s ease-out infinite;"></span>`
    : '';
  return L.divIcon({
    className: 'leaflet-div-icon',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${ring}
        <div style="
          position:relative;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;
          background:${color};transform:rotate(45deg);
          box-shadow:0 3px 8px rgba(0,0,0,.4);
          border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;">
          <span style="transform:rotate(-45deg);color:#fff;font-size:13px;font-weight:800;
            font-family:Inter,sans-serif;line-height:1;">${glyph}</span>
        </div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const MARKER_GLYPHS: Record<string, string> = {
  FUEL: '⛽',
  BREAK_30MIN: 'B',
  DAILY_RESET_10H: 'R',
  CYCLE_RESTART_34H: 'R',
};

/** Fit the map to the route bounds whenever the route changes. */
function FitBounds({ positions }: { positions: L.LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), {
        padding: [48, 48],
        animate: true,
        duration: 0.8,
      });
    }
  }, [positions, map]);
  return null;
}

export default function TripMap({ data }: Props) {
  const theme = useTheme();
  const { mode } = useColorMode();
  const tiles = TILES[mode];

  const routeLatLngs = useMemo<L.LatLngExpression[]>(
    () =>
      data.route_geometry.features[0]?.geometry.coordinates.map(
        ([lon, lat]) => [lat, lon] as L.LatLngExpression,
      ) ?? [],
    [data],
  );

  const { current, pickup, dropoff } = data.waypoints;

  const stopEvents = useMemo<TimelineEvent[]>(
    () =>
      data.timeline_events.filter((e) =>
        ['FUEL', 'BREAK_30MIN', 'DAILY_RESET_10H', 'CYCLE_RESTART_34H'].includes(
          e.event_type,
        ),
      ),
    [data],
  );

  const startIcon = makeIcon(EVENT_META.PRE_TRIP.color, 'S', 34, true);
  const pickupIcon = makeIcon(EVENT_META.PICKUP.color, 'P', 32);
  const dropoffIcon = makeIcon(EVENT_META.DROPOFF.color, 'D', 34, true);

  const center: L.LatLngExpression =
    routeLatLngs[Math.floor(routeLatLngs.length / 2)] ?? [39.8, -98.5];

  return (
    <Card sx={{ overflow: 'hidden' }}>
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
        }}
      >
        <RouteRoundedIcon color="primary" fontSize="small" />
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Route map
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Road-optimized route with all required stops
          </Typography>
        </Box>
      </Box>

      <Box sx={{ height: { xs: 380, md: 480 }, width: '100%', position: 'relative' }}>
        <MapContainer
          center={center}
          zoom={5}
          scrollWheelZoom
          zoomControl={false}
          style={{ height: '100%', width: '100%', background: 'transparent' }}
        >
          <TileLayer key={mode} attribution={tiles.attr} url={tiles.url} />

          {routeLatLngs.length > 1 && (
            <>
              {/* Soft glow underlay + crisp accent line with draw animation. */}
              <Polyline
                positions={routeLatLngs}
                pathOptions={{ color: '#6366f1', weight: 9, opacity: 0.18 }}
              />
              <Polyline
                positions={routeLatLngs}
                className="route-draw"
                pathOptions={{ color: '#6366f1', weight: 4, opacity: 0.95 }}
              />
              <FitBounds positions={routeLatLngs} />
            </>
          )}

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

      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}
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
              border: `1px solid ${item.c}40`,
            }}
          />
        ))}
      </Stack>
    </Card>
  );
}
