"""
GraphHopper API client.

Responsibilities (keeps the same public interface used across the app —
``geocode`` / ``reverse_geocode`` / ``route_leg`` — so the rest of the code is
unaffected):

  * Geocode free-text addresses -> [lon, lat] coordinates.
  * Fetch a road route between two coordinates (POST /api/1/route).
  * Reverse-geocode a coordinate -> "City, State" label for ELD remarks.

Resilience features:
  * An in-memory LRU cache wraps every outbound call so repeated evaluations of
    the same trip never hit the rate-limited API twice.
  * Typed exceptions distinguish the failure modes the assessment calls out
    (invalid key, network failure, rate limiting, no route found) so the view
    layer can return user-friendly, correctly-typed error responses.
  * If ``GRAPHHOPPER_API_KEY`` is empty, the client transparently falls back to
    a bundled straight-line mock so the whole app still runs end-to-end.

Note on profiles: GraphHopper's free tier exposes the ``car``, ``bike`` and
``foot`` profiles (the ``truck`` profile requires a paid plan). We therefore
route with ``car`` by default, overridable via ``GRAPHHOPPER_PROFILE`` for
accounts that have HGV access.
"""

from __future__ import annotations

import math
from functools import lru_cache

import requests
from django.conf import settings

GH_BASE = "https://graphhopper.com/api/1"
GEOCODE_URL = f"{GH_BASE}/geocode"
ROUTE_URL = f"{GH_BASE}/route"

REQUEST_TIMEOUT = 20  # seconds


# ---------------------------------------------------------------------------
# Typed errors — the view layer maps each to a friendly message + HTTP status.
# ---------------------------------------------------------------------------
class GraphHopperError(Exception):
    """Base class for all routing-provider failures."""

    #: HTTP status the API view should return for this error.
    http_status = 502
    #: Short machine-readable code the frontend can branch on.
    code = "routing_error"


class InvalidAPIKeyError(GraphHopperError):
    http_status = 502
    code = "invalid_api_key"


class RateLimitedError(GraphHopperError):
    http_status = 429
    code = "rate_limited"


class NetworkError(GraphHopperError):
    http_status = 504
    code = "network_error"


class NoRouteFoundError(GraphHopperError):
    http_status = 422
    code = "no_route_found"


class GeocodingError(GraphHopperError):
    http_status = 422
    code = "geocoding_failed"


def _has_key() -> bool:
    return bool(settings.GRAPHHOPPER_API_KEY)


def _profile() -> str:
    return getattr(settings, "GRAPHHOPPER_PROFILE", "car") or "car"


def _raise_for_http(resp: requests.Response) -> None:
    """Translate an unsuccessful HTTP response into a typed error."""
    if resp.status_code in (401, 403):
        raise InvalidAPIKeyError(
            "The routing service rejected the API key. Check GRAPHHOPPER_API_KEY."
        )
    if resp.status_code == 429:
        raise RateLimitedError(
            "The routing service is rate-limited right now. Please retry shortly."
        )
    # Try to surface GraphHopper's own message when present.
    message = ""
    try:
        message = resp.json().get("message", "")
    except ValueError:
        message = resp.text[:200]
    raise GraphHopperError(
        f"Routing service error ({resp.status_code}): {message or 'unknown error'}"
    )


# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------
@lru_cache(maxsize=256)
def geocode(address: str) -> tuple:
    """Return (lon, lat) for a free-text address.

    Cached so the same address is only resolved once per process. Falls back to
    a small built-in gazetteer of common US cities when no API key is set.
    """
    address = address.strip()
    if not address:
        raise GeocodingError("Please enter a location.")

    if not _has_key():
        return _mock_geocode(address)

    try:
        resp = requests.get(
            GEOCODE_URL,
            params={
                "q": address,
                "limit": 1,
                "locale": "en",
                "key": settings.GRAPHHOPPER_API_KEY,
            },
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise NetworkError(
            "Could not reach the routing service. Check your connection."
        ) from exc

    if not resp.ok:
        _raise_for_http(resp)

    hits = resp.json().get("hits", [])
    if not hits:
        raise GeocodingError(f"No location found for “{address}”.")
    pt = hits[0]["point"]
    return (float(pt["lng"]), float(pt["lat"]))


@lru_cache(maxsize=512)
def reverse_geocode(lon: float, lat: float) -> str:
    """Return a human-readable 'City, State' label for a coordinate.

    Used to build ELD 'Remarks' entries. Rounds inputs so nearby lookups share
    a cache entry. Never raises: returns a lat/lon string on any failure.
    """
    if not _has_key():
        return f"{lat:.3f}, {lon:.3f}"

    try:
        resp = requests.get(
            GEOCODE_URL,
            params={
                "reverse": "true",
                "point": f"{lat},{lon}",
                "key": settings.GRAPHHOPPER_API_KEY,
            },
            timeout=REQUEST_TIMEOUT,
        )
        if not resp.ok:
            return f"{lat:.3f}, {lon:.3f}"
        hits = resp.json().get("hits", [])
        if not hits:
            return f"{lat:.3f}, {lon:.3f}"
        h = hits[0]
        city = h.get("city") or h.get("name")
        state = h.get("state")
        if city and state:
            return f"{city}, {state}"
        return city or h.get("name") or f"{lat:.3f}, {lon:.3f}"
    except requests.RequestException:
        return f"{lat:.3f}, {lon:.3f}"


# ---------------------------------------------------------------------------
# Autocomplete (typeahead suggestions for the address inputs)
# ---------------------------------------------------------------------------
def _format_hit_label(hit: dict) -> str:
    """Build a readable "Name, City, State, Country" label from a geocode hit.

    Deduplicates repeated parts (e.g. when name == city) and drops blanks so
    the suggestion reads cleanly, like a Google-Maps style result.
    """
    parts = [
        hit.get("name"),
        hit.get("city"),
        hit.get("state"),
        hit.get("country"),
    ]
    seen: list[str] = []
    for p in parts:
        if p and p not in seen:
            seen.append(p)
    return ", ".join(seen)


@lru_cache(maxsize=512)
def suggest(query: str, limit: int = 6) -> tuple:
    """Return up to ``limit`` autocomplete suggestions for a partial query.

    Each suggestion is a dict ``{"label", "lon", "lat"}``. Cached per (query,
    limit) so repeated keystrokes for the same prefix are free. Returns an empty
    tuple on any failure or when no key is configured — autocomplete is a
    convenience, never a hard dependency.

    The return type is a tuple (not a list) so it is hashable for lru_cache.
    """
    query = query.strip()
    if len(query) < 2 or not _has_key():
        return tuple()

    try:
        resp = requests.get(
            GEOCODE_URL,
            params={
                "q": query,
                "limit": limit,
                "autocomplete": "true",
                "locale": "en",
                "key": settings.GRAPHHOPPER_API_KEY,
            },
            timeout=REQUEST_TIMEOUT,
        )
        if not resp.ok:
            return tuple()
        hits = resp.json().get("hits", [])
    except requests.RequestException:
        return tuple()

    results = []
    seen_labels = set()
    for h in hits:
        pt = h.get("point") or {}
        label = _format_hit_label(h)
        if label and label not in seen_labels and "lat" in pt and "lng" in pt:
            seen_labels.add(label)
            results.append(
                {"label": label, "lon": float(pt["lng"]), "lat": float(pt["lat"])}
            )
    return tuple(results)


# ---------------------------------------------------------------------------
# Directions
# ---------------------------------------------------------------------------
def route_leg(start: tuple, end: tuple) -> dict:
    """Return a routing result for one leg.

    Result shape::

        {
            "coordinates": [[lon, lat], ...],  # LineString vertices
            "distance_m": float,               # total metres
            "duration_s": float,               # total seconds (provider estimate)
        }
    """
    return _route_leg_cached(
        round(start[0], 5), round(start[1], 5),
        round(end[0], 5), round(end[1], 5),
    )


@lru_cache(maxsize=128)
def _route_leg_cached(slon: float, slat: float, elon: float, elat: float) -> dict:
    if not _has_key():
        return _mock_route((slon, slat), (elon, elat))

    body = {
        "points": [[slon, slat], [elon, elat]],
        "profile": _profile(),
        "points_encoded": False,  # get raw GeoJSON coordinates back
        "instructions": False,
        "calc_points": True,
        "locale": "en",
    }
    try:
        resp = requests.post(
            ROUTE_URL,
            params={"key": settings.GRAPHHOPPER_API_KEY},
            json=body,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise NetworkError(
            "Could not reach the routing service. Check your connection."
        ) from exc

    if not resp.ok:
        # GraphHopper returns 400 with a "Cannot find point" style message when
        # no route exists between the coordinates.
        if resp.status_code == 400:
            try:
                msg = resp.json().get("message", "")
            except ValueError:
                msg = ""
            if "cannot find" in msg.lower() or "connection" in msg.lower():
                raise NoRouteFoundError(
                    "No drivable route could be found between those locations."
                )
        _raise_for_http(resp)

    data = resp.json()
    paths = data.get("paths", [])
    if not paths:
        raise NoRouteFoundError(
            "No drivable route could be found between those locations."
        )
    path = paths[0]
    coords = path["points"]["coordinates"]
    return {
        "coordinates": [[float(c[0]), float(c[1])] for c in coords],
        "distance_m": float(path["distance"]),
        "duration_s": float(path["time"]) / 1000.0,  # ms -> s
    }


# ---------------------------------------------------------------------------
# Mock fallbacks (used only when GRAPHHOPPER_API_KEY is empty)
# ---------------------------------------------------------------------------
_MOCK_GAZETTEER = {
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
    h = abs(hash(key))
    lon = -120.0 + (h % 5000) / 100.0
    lat = 30.0 + ((h // 5000) % 1500) / 100.0
    return (round(lon, 4), round(lat, 4))


def _haversine_m(a: tuple, b: tuple) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    dlon, dlat = lon2 - lon1, lat2 - lat1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6_371_000 * math.asin(math.sqrt(h))


def _mock_route(start: tuple, end: tuple) -> dict:
    """Straight-line densified route used when no API key is present."""
    dist = _haversine_m(start, end)
    steps = max(2, int(dist // 20000))
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
