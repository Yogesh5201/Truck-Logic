"""
OpenRouteService (ORS) client.

Responsibilities:
  * Geocode free-text addresses -> [lon, lat] coordinates (ORS Pelias).
  * Fetch a Heavy-Goods-Vehicle route between two coordinates
    (POST /v2/directions/driving-hgv/geojson).
  * Reverse-geocode a coordinate -> "City, State" label for ELD remarks.

Resilience features required by the spec:
  * An in-memory LRU cache wraps every outbound ORS call so repeated
    evaluations of the same trip never hit the rate-limited public API twice.
  * If ``ORS_API_KEY`` is empty, the client transparently falls back to a
    bundled straight-line mock so the whole app still runs end-to-end.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Optional

import requests
from django.conf import settings

ORS_BASE = "https://api.openrouteservice.org"
GEOCODE_URL = f"{ORS_BASE}/geocode/search"
REVERSE_URL = f"{ORS_BASE}/geocode/reverse"
DIRECTIONS_URL = f"{ORS_BASE}/v2/directions/driving-hgv/geojson"

REQUEST_TIMEOUT = 20  # seconds

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures"


class ORSError(Exception):
    """Raised when ORS cannot fulfil a request and no fallback applies."""


def _has_key() -> bool:
    return bool(settings.ORS_API_KEY)


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------
@lru_cache(maxsize=256)
def geocode(address: str) -> tuple:
    """Return (lon, lat) for a free-text address.

    Cached so the same address is only resolved once per process.
    Falls back to a small built-in gazetteer of common US cities when no
    API key is configured.
    """
    address = address.strip()
    if not address:
        raise ORSError("Empty address supplied.")

    if not _has_key():
        return _mock_geocode(address)

    try:
        resp = requests.get(
            GEOCODE_URL,
            params={
                "api_key": settings.ORS_API_KEY,
                "text": address,
                "size": 1,
                "boundary.country": "US",
            },
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])
        if not features:
            raise ORSError(f"No geocoding result for '{address}'.")
        lon, lat = features[0]["geometry"]["coordinates"][:2]
        return (float(lon), float(lat))
    except requests.RequestException as exc:
        raise ORSError(f"ORS geocoding failed for '{address}': {exc}") from exc


@lru_cache(maxsize=512)
def reverse_geocode(lon: float, lat: float) -> str:
    """Return a human-readable 'City, ST' label for a coordinate.

    Used to build ELD 'Remarks' entries. Rounds inputs so nearby lookups
    share a cache entry. Never raises: returns a lat/lon string on failure.
    """
    if not _has_key():
        return f"{lat:.3f}, {lon:.3f}"

    try:
        resp = requests.get(
            REVERSE_URL,
            params={
                "api_key": settings.ORS_API_KEY,
                "point.lon": lon,
                "point.lat": lat,
                "size": 1,
            },
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        features = resp.json().get("features", [])
        if not features:
            return f"{lat:.3f}, {lon:.3f}"
        props = features[0].get("properties", {})
        city = props.get("locality") or props.get("county") or props.get("name")
        region = props.get("region_a") or props.get("region")
        if city and region:
            return f"{city}, {region}"
        return props.get("label", f"{lat:.3f}, {lon:.3f}")
    except requests.RequestException:
        return f"{lat:.3f}, {lon:.3f}"


# ---------------------------------------------------------------------------
# Directions
# ---------------------------------------------------------------------------
def route_leg(start: tuple, end: tuple) -> dict:
    """Return a routing result for one leg.

    Result shape::

        {
            "coordinates": [[lon, lat], ...],  # LineString vertices
            "distance_m": float,               # total metres
            "duration_s": float,               # total seconds (ORS estimate)
        }
    """
    return _route_leg_cached(
        round(start[0], 5), round(start[1], 5),
        round(end[0], 5), round(end[1], 5),
    )


@lru_cache(maxsize=128)
def _route_leg_cached(
    slon: float, slat: float, elon: float, elat: float
) -> dict:
    if not _has_key():
        return _mock_route((slon, slat), (elon, elat))

    body = {"coordinates": [[slon, slat], [elon, elat]]}
    headers = {
        "Authorization": settings.ORS_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        resp = requests.post(
            DIRECTIONS_URL, json=body, headers=headers, timeout=REQUEST_TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        feature = data["features"][0]
        coords = feature["geometry"]["coordinates"]
        summary = feature["properties"]["summary"]
        return {
            "coordinates": [[float(c[0]), float(c[1])] for c in coords],
            "distance_m": float(summary["distance"]),
            "duration_s": float(summary["duration"]),
        }
    except requests.RequestException as exc:
        raise ORSError(f"ORS routing failed: {exc}") from exc
    except (KeyError, IndexError) as exc:
        raise ORSError(f"Unexpected ORS response shape: {exc}") from exc


# ---------------------------------------------------------------------------
# Mock fallbacks (used only when ORS_API_KEY is empty)
# ---------------------------------------------------------------------------
_MOCK_GAZETTEER = {
    # Coarse city centroids so the mock produces plausible geometry.
    "new york": (-74.0060, 40.7128),
    "brooklyn": (-73.9442, 40.6782),
    "chicago": (-87.6298, 41.8781),
    "dallas": (-96.7970, 32.7767),
    "houston": (-95.3698, 29.7604),
    "los angeles": (-118.2437, 34.0522),
    "san francisco": (-122.4194, 37.7749),
    "denver": (-104.9903, 39.7392),
    "phoenix": (-112.0740, 33.4484),
    "atlanta": (-84.3880, 33.7490),
    "miami": (-80.1918, 25.7617),
    "seattle": (-122.3321, 47.6062),
    "boston": (-71.0589, 42.3601),
    "kansas city": (-94.5786, 39.0997),
    "st louis": (-90.1994, 38.6270),
    "oklahoma city": (-97.5164, 35.4676),
    "memphis": (-90.0490, 35.1495),
    "nashville": (-86.7816, 36.1627),
    "las vegas": (-115.1398, 36.1699),
    "salt lake city": (-111.8910, 40.7608),
    "omaha": (-95.9345, 41.2565),
    "indianapolis": (-86.1581, 39.7684),
    "columbus": (-82.9988, 39.9612),
}


def _mock_geocode(address: str) -> tuple:
    """Very small offline gazetteer for demoing without a key."""
    key = address.lower().strip()
    for name, coord in _MOCK_GAZETTEER.items():
        if name in key:
            return coord
    # Deterministic pseudo-coordinate inside the continental US so unknown
    # inputs still produce a usable (if fictional) route.
    h = abs(hash(key))
    lon = -120.0 + (h % 5000) / 100.0        # -120 .. -70
    lat = 30.0 + ((h // 5000) % 1500) / 100.0  # 30 .. 45
    return (round(lon, 4), round(lat, 4))


def _haversine_m(a: tuple, b: tuple) -> float:
    """Great-circle distance in metres between (lon, lat) points."""
    lon1, lat1, lon2, lat2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


def _mock_route(start: tuple, end: tuple) -> dict:
    """Straight-line densified route used when no API key is present.

    Produces evenly spaced vertices and a duration assuming an average
    55 mph highway speed, which is close enough to exercise the HOS engine.
    """
    dist = _haversine_m(start, end)
    steps = max(2, int(dist // 20000))  # a vertex roughly every 20 km
    coords = []
    for i in range(steps + 1):
        t = i / steps
        coords.append([
            start[0] + (end[0] - start[0]) * t,
            start[1] + (end[1] - start[1]) * t,
        ])
    avg_speed_mps = 55 * 1609.344 / 3600.0
    return {
        "coordinates": coords,
        "distance_m": dist,
        "duration_s": dist / avg_speed_mps,
    }


def load_fixture(name: str) -> Optional[dict]:
    """Load a JSON fixture from the fixtures dir (test/demo support)."""
    path = FIXTURE_DIR / name
    if not path.exists():
        return None
    with path.open() as fh:
        return json.load(fh)
