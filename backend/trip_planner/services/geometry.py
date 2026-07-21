"""
Pure geometry helpers for the spatio-temporal projection.

These functions have no ORS or Django dependency so they can be unit tested
in isolation. Coordinates are always ``[lon, lat]`` to match GeoJSON order.
"""

from __future__ import annotations

import math
from typing import List, Sequence

EARTH_RADIUS_M = 6_371_000.0


def haversine_m(a: Sequence[float], b: Sequence[float]) -> float:
    """Great-circle distance in metres between two [lon, lat] points."""
    lon1, lat1, lon2, lat2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    h = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


class RouteTrack:
    """A drivable polyline with per-edge distance and duration.

    The track is the concatenation of both trip legs. Each edge (segment
    between consecutive vertices) carries:
      * ``edge_dist[i]`` – metres, measured with the haversine formula
      * ``edge_dur[i]``  – hours, apportioned from the ORS leg duration in
        proportion to the edge's share of that leg's distance

    ``pickup_index`` is the vertex index at which leg 1 ends and leg 2 begins
    (i.e. the pickup location), so the simulator knows where to inject the
    1-hour loading event.
    """

    def __init__(
        self,
        coords: List[List[float]],
        edge_dist: List[float],
        edge_dur: List[float],
        pickup_index: int,
    ) -> None:
        self.coords = coords
        self.edge_dist = edge_dist
        self.edge_dur = edge_dur
        self.pickup_index = pickup_index

        # Cumulative distance (metres) at each vertex, for point_at().
        self.cum_dist: List[float] = [0.0]
        for d in edge_dist:
            self.cum_dist.append(self.cum_dist[-1] + d)

        self.total_distance_m = self.cum_dist[-1]
        self.total_drive_hours = sum(edge_dur)

    def point_at(self, target_m: float) -> List[float]:
        """Linear-interpolate the [lon, lat] at a cumulative distance.

        This is the core of "projecting a temporal event back onto space":
        given the metres travelled when a stop is triggered, return the exact
        coordinate on the polyline.
        """
        if target_m <= 0:
            return list(self.coords[0])
        if target_m >= self.total_distance_m:
            return list(self.coords[-1])

        # Binary-ish linear scan over cumulative distances.
        for i in range(len(self.edge_dist)):
            start_cum = self.cum_dist[i]
            end_cum = self.cum_dist[i + 1]
            if start_cum <= target_m <= end_cum:
                seg = end_cum - start_cum
                t = 0.0 if seg == 0 else (target_m - start_cum) / seg
                a = self.coords[i]
                b = self.coords[i + 1]
                return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
        return list(self.coords[-1])


def build_track_from_legs(leg1: dict, leg2: dict) -> RouteTrack:
    """Combine two ORS legs into a single :class:`RouteTrack`.

    Each ``leg`` is the dict returned by ``ors_client.route_leg`` with keys
    ``coordinates``, ``distance_m`` and ``duration_s``. Per-edge durations are
    apportioned from the leg total by distance share so the average speed
    profile matches ORS while remaining locally consistent.
    """
    coords: List[List[float]] = []
    edge_dist: List[float] = []
    edge_dur: List[float] = []

    def append_leg(leg: dict, skip_first: bool) -> None:
        pts = leg["coordinates"]
        # Distance measured locally so per-edge interpolation is exact.
        local_dists = [
            haversine_m(pts[i], pts[i + 1]) for i in range(len(pts) - 1)
        ]
        local_total = sum(local_dists) or 1.0
        leg_hours = leg["duration_s"] / 3600.0

        start = 1 if skip_first else 0
        if not skip_first:
            coords.append(list(pts[0]))
        for i in range(start, len(pts)):
            coords.append(list(pts[i]))
        for i, d in enumerate(local_dists):
            edge_dist.append(d)
            # Apportion this leg's duration by the edge's distance share.
            edge_dur.append(leg_hours * (d / local_total))

    append_leg(leg1, skip_first=False)
    pickup_index = len(coords) - 1  # last vertex of leg 1 == pickup
    append_leg(leg2, skip_first=True)

    return RouteTrack(coords, edge_dist, edge_dur, pickup_index)
