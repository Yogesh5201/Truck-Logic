# TruckLogic — HOS-Compliant Truck Routing & ELD Log Generator

A full-stack application that takes trip details as input and produces:

1. **An interactive route map** (Leaflet + OpenStreetMap) showing the
   HGV-optimized route with markers for the start, pickup, dropoff, fuel
   stops, and mandatory HOS rest breaks.
2. **FMCSA daily ELD log sheets** — the standard 24-hour driver's log grid,
   drawn on an HTML5 Canvas with the stepped duty-status line, one sheet per
   day of the trip, each with a remarks table and per-status hour totals.

Built with **Django + Django REST Framework** (backend) and
**React + TypeScript + Vite + MUI** (frontend).

---

## Table of Contents
- [Architecture](#architecture)
- [The HOS State Machine (the core math)](#the-hos-state-machine-the-core-math)
- [API Contract](#api-contract)
- [Local Setup](#local-setup)
- [Adding your OpenRouteService key](#adding-your-openrouteservice-key)
- [Running Tests](#running-tests)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## Architecture

The system deliberately **decouples spatial routing from temporal
compliance**. OpenRouteService returns a purely *spatial* path (a polyline
with distance + optimal-speed duration). The FMCSA Hours-of-Service (HOS)
rules are a *temporal* constraint system. The backend's job is to walk the
spatial path while advancing a set of regulatory clocks, **injecting**
mandatory rests / breaks / fuel stops at the exact moment a limit binds, and
**projecting** each injected event back onto a coordinate via linear
interpolation along the polyline.

```
 Address inputs ──▶ ORS geocode ──▶ ORS driving-hgv (2 legs)
                                          │
                                          ▼
                    RouteTrack (polyline + per-edge dist/time)
                                          │
                                          ▼
                    HOSSimulator  ── walks the track, enforcing:
                      • 11h drive / 14h window / 8h break
                      • 70h cycle / 10h reset / 34h restart
                      • fuel every 1,000 mi
                      • 1h pickup + 1h dropoff + 15m pre-trip
                                          │
                                          ▼
                    timeline_events[]  (flat, chronological)
                          │                     │
                          ▼                     ▼
                    React Leaflet map     ELD Canvas grids
```

The **backend does all heavy computation**; the frontend only renders. The
response is shaped so the browser never re-derives HOS logic.

---

## The HOS State Machine (the core math)

Property-carrying driver, 70-hour / 8-day cycle. All logic lives in
[`backend/trip_planner/services/hos_engine.py`](backend/trip_planner/services/hos_engine.py).

The simulator maintains five running accumulators, reset at different points:

| Clock | Limit | What resets it |
|---|---|---|
| `drive_since_rest` | **11 h** driving | 10h reset, 34h restart |
| `window_since_rest` | **14 h** on-duty window (absolute) | 10h reset, 34h restart |
| `drive_since_break` | **8 h** driving before a break | 30-min break, 10h, 34h |
| `cycle_used` | **70 h** on-duty in 8 days | 34h restart only |
| `dist_since_fuel` | **1,000 mi** (1,609,344 m) | fuel stop |

### Available cycle hours
The user supplies **Current Cycle Used (Hrs)** = `C_used`. Available hours at
trip start:

```
C_avail = 70 − C_used
```

Every driving *and* on-duty-not-driving hour decrements the cycle. When
`cycle_used` reaches 70 before the trip finishes, a **34-hour restart** is
injected and the cycle resets to 0.

### Precedence when several limits bind
Each driving step advances only as far as the *nearest* binding limit:

```python
allow = min(
    11 − drive_since_rest,
    14 − window_since_rest,
    8  − drive_since_break,
    70 − cycle_used,
    (FUEL_INTERVAL_METERS − dist_since_fuel) / speed,
    hours_remaining_on_leg,
)
```

When `allow` hits 0, the engine services the exhausted clock in priority
order: **cycle restart (34h) → daily reset (10h) → 30-min break → fuel stop**,
then resumes driving.

### Worked edge case — `C_used = 68`
`C_avail = 2`. The driver may legally drive ~2 hours (minus the 0.25h pre-trip
on-duty that also counts against the cycle), then the engine injects a full
**34-hour restart**, resets the cycle to 70 available, and continues. This is
covered by `test_cycle_almost_exhausted_forces_34h_restart`.

### Spatial projection
Every injected stop needs a map coordinate. The `RouteTrack` stores cumulative
distance at each vertex; `point_at(meters)` linearly interpolates the
`[lon, lat]` at any distance along the polyline
([`services/geometry.py`](backend/trip_planner/services/geometry.py)).

### Route simplification
Long routes are simplified with the **Douglas–Peucker** algorithm (via
Shapely) before being sent to the client, keeping the GeoJSON payload light
without visible distortion.

---

## API Contract

### `POST /api/v1/simulate-trip/`

**Request**
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Kansas City, MO",
  "dropoff_location": "Dallas, TX",
  "current_cycle_used": 10.0
}
```

**Response (abridged)**
```json
{
  "trip_summary": {
    "total_distance_mi": 866.7,
    "total_duration_hr": 28.5,
    "driving_hr": 15.75,
    "num_fuel_stops": 0,
    "num_daily_resets": 1,
    "num_cycle_restarts": 0,
    "num_log_sheets": 2,
    "cycle_available_start": 60.0
  },
  "route_geometry": { "type": "FeatureCollection", "features": [ /* LineString */ ] },
  "timeline_events": [
    {
      "event_type": "DRIVE",
      "status": "DRIVING",
      "start_hr": 0.25,
      "end_hr": 7.98,
      "duration_hrs": 7.73,
      "start_coord": [-87.63, 41.88],
      "end_coord": [-94.58, 39.10],
      "distance_mi": 425.1,
      "location_label": "Chicago, IL",
      "note": "Driving"
    }
  ],
  "waypoints": { "current": {...}, "pickup": {...}, "dropoff": {...} }
}
```

`GET /api/v1/health/` → `{"status": "ok"}` (liveness probe).

---

## Local Setup

**Prerequisites:** Python 3.12+, Node 18+.

### 1. Backend
```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then add your ORS key (see below)
python manage.py runserver 8000
```
Backend runs at `http://localhost:8000`. **Without an ORS key it still runs**
using a built-in straight-line mock so you can develop offline.

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_BASE_URL defaults to localhost:8000
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## Adding your OpenRouteService key

1. Get a free key at <https://openrouteservice.org/dev/#/signup>.
2. Open `backend/.env` and paste it:
   ```
   ORS_API_KEY=your-key-here
   ```
3. Restart the backend. It now uses real HGV routing, geocoding, and
   reverse-geocoded remarks. Responses are cached in-memory so repeated
   identical trips don't burn your rate limit.

---

## Running Tests

```bash
cd backend
python manage.py test
```
Covers the 11h/14h/8h limits, the 70h cycle with the 34h restart edge case,
fuel-stop injection, and timeline contiguity (9 tests).

Frontend type-check / build:
```bash
cd frontend
npm run build
```

---

## Deployment

### Backend → Render (Docker)
- `render.yaml` is included as a blueprint. Push to GitHub, create a new
  **Blueprint** on Render, and set `ORS_API_KEY` + `CORS_ALLOWED_ORIGINS`
  (your Vercel URL) in the dashboard.
- Or deploy the `backend/Dockerfile` to any PaaS (Heroku, Fly.io, Railway).

### Frontend → Vercel
- Import the repo, set **Root Directory** to `frontend`.
- Add env var `VITE_API_BASE_URL = https://<your-backend>/api/v1`.
- `vercel.json` handles the SPA rewrite.

---

## Project Structure

```
backend/
  config/                 Django project (settings, urls, wsgi)
  trip_planner/
    views.py              thin DRF endpoint
    serializers.py        input validation (0–70h cycle, non-blank addresses)
    constants.py          all HOS numbers in one place
    services/
      ors_client.py       ORS geocode + driving-hgv + reverse-geocode, cached
      geometry.py         RouteTrack + linear interpolation (framework-free)
      hos_engine.py       the HOS finite state machine (framework-free)
      simulator.py        orchestration + response assembly + simplification
    tests/test_hos_engine.py
frontend/
  src/
    api/client.ts         typed fetch wrapper
    store/tripStore.ts    Zustand global state
    theme/theme.ts        MUI theme + shared status/event colors
    components/
      TripForm.tsx        inputs + one-click presets
      TripSummary.tsx     metric cards
      TripMap.tsx         react-leaflet map, custom SVG markers, fitBounds
      EldCanvas.tsx       HTML5 Canvas 24h grid + stepped line
      EldLogViewer.tsx    day pagination + remarks table + totals
      eldLogic.ts         midnight-splitting into per-day sheets
```

---

*Simulated HOS routing for evaluation purposes — not for operational
compliance use.*
