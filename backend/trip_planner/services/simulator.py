"""
Top-level trip simulation orchestrator.

Ties together:
  * GraphHopper geocoding + road routing (two legs)
  * the HOS temporal projection engine
  * Douglas-Peucker route simplification (Shapely)
  * reverse-geocoded ELD remarks

and assembles the structured response consumed by the React frontend:
``trip_summary`` / ``route_geometry`` / ``timeline_events``.
"""

from __future__ import annotations

from typing import List

from shapely.geometry import LineString

from . import geometry as geo
from . import graphhopper_client as routing
from .. import constants as C
from .hos_engine import DutyEvent, HOSSimulator

# Duty statuses that represent a "change" worth a remark / map marker.
_MARKER_EVENTS = {
    C.EVENT_PRE_TRIP,
    C.EVENT_PICKUP,
    C.EVENT_DROPOFF,
    C.EVENT_FUEL,
    C.EVENT_BREAK,
    C.EVENT_DAILY_RESET,
    C.EVENT_CYCLE_RESTART,
}


def simulate_trip(
    current: str, pickup: str, dropoff: str, cycle_used: float
) -> dict:
    """Run a full simulation from three address strings + cycle hours."""
    # 1) Geocode the three waypoints -> (lon, lat).
    current_c = routing.geocode(current)
    pickup_c = routing.geocode(pickup)
    dropoff_c = routing.geocode(dropoff)

    # 2) Route the two legs (deadhead + loaded).
    leg1 = routing.route_leg(current_c, pickup_c)
    leg2 = routing.route_leg(pickup_c, dropoff_c)

    # 3) Build the combined track and run the HOS engine.
    track = geo.build_track_from_legs(leg1, leg2)
    sim = HOSSimulator(track=track, cycle_used_start=float(cycle_used))
    events = sim.run()

    # 4) Assemble the response payload.
    route_geometry = _build_route_geometry(track)
    timeline_events = _build_timeline(events)
    trip_summary = _build_summary(track, events, cycle_used)

    return {
        "trip_summary": trip_summary,
        "route_geometry": route_geometry,
        "timeline_events": timeline_events,
        "waypoints": {
            "current": {"coord": list(current_c), "label": current},
            "pickup": {"coord": list(pickup_c), "label": pickup},
            "dropoff": {"coord": list(dropoff_c), "label": dropoff},
        },
    }


# --------------------------------------------------------------------------- #
# Response builders
# --------------------------------------------------------------------------- #
def _build_route_geometry(track: geo.RouteTrack) -> dict:
    """Return a simplified GeoJSON FeatureCollection for the route line.

    Long cross-country routes can contain thousands of vertices; the
    Douglas-Peucker algorithm (via Shapely) collapses near-collinear points
    to keep the payload light without visible distortion when zoomed out.
    """
    line = LineString(track.coords)
    simplified = line.simplify(C.SIMPLIFY_TOLERANCE_DEG, preserve_topology=False)
    coords = [[round(x, 6), round(y, 6)] for x, y in simplified.coords]

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"kind": "route"},
                "geometry": {"type": "LineString", "coordinates": coords},
            }
        ],
    }


def _build_timeline(events: List[DutyEvent]) -> List[dict]:
    """Serialise events and attach reverse-geocoded remarks to stops."""
    out = []
    for ev in events:
        d = ev.to_dict()
        if ev.event_type in _MARKER_EVENTS or ev.event_type == C.EVENT_DRIVE:
            lon, lat = ev.start_coord
            d["location_label"] = routing.reverse_geocode(
                round(lon, 3), round(lat, 3)
            )
        else:
            d["location_label"] = ""
        out.append(d)
    return out


def _build_summary(
    track: geo.RouteTrack, events: List[DutyEvent], cycle_used: float
) -> dict:
    """Aggregate high-level metrics for the dashboard."""
    total_distance_mi = track.total_distance_m / C.METERS_PER_MILE
    total_duration_hr = sum(e.duration_hrs for e in events)
    drive_hr = sum(e.duration_hrs for e in events if e.status == C.STATUS_DRIVING)
    on_duty_hr = sum(
        e.duration_hrs for e in events if e.status == C.STATUS_ON_DUTY
    )
    rest_hr = sum(
        e.duration_hrs
        for e in events
        if e.status in (C.STATUS_OFF_DUTY, C.STATUS_SLEEPER)
    )

    num_fuel = sum(1 for e in events if e.event_type == C.EVENT_FUEL)
    num_daily = sum(1 for e in events if e.event_type == C.EVENT_DAILY_RESET)
    num_restart = sum(1 for e in events if e.event_type == C.EVENT_CYCLE_RESTART)
    num_breaks = sum(1 for e in events if e.event_type == C.EVENT_BREAK)

    # Number of 24-hour ELD sheets required to render the whole timeline.
    log_sheets = max(1, int(total_duration_hr // 24) + (1 if total_duration_hr % 24 else 0))

    return {
        "total_distance_mi": round(total_distance_mi, 1),
        "total_duration_hr": round(total_duration_hr, 2),
        "driving_hr": round(drive_hr, 2),
        "on_duty_hr": round(on_duty_hr, 2),
        "rest_hr": round(rest_hr, 2),
        "cycle_used_start": round(float(cycle_used), 2),
        "cycle_available_start": round(C.CYCLE_LIMIT_HOURS - float(cycle_used), 2),
        "num_fuel_stops": num_fuel,
        "num_daily_resets": num_daily,
        "num_cycle_restarts": num_restart,
        "num_breaks": num_breaks,
        "num_log_sheets": log_sheets,
    }
