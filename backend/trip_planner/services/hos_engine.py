"""
FMCSA Hours-of-Service (HOS) temporal projection engine.

This module contains the finite state machine that turns a purely *spatial*
route (a polyline with distances and ORS-estimated driving durations) into a
*temporal* timeline of duty-status events, injecting every mandatory rest,
break, fuel and load-handling interruption at the correct moment.

The engine is deliberately framework-free (no Django / no HTTP) so it can be
unit-tested directly.

Clocks tracked (all in hours unless noted), reset points in brackets:

  drive_since_rest   11h driving limit          [10h reset, 34h restart]
  window_since_rest  14h on-duty window         [10h reset, 34h restart]
  drive_since_break  8h -> 30-min break          [30-min break, 10h, 34h]
  cycle_used         70h / 8-day on-duty         [34h restart only]
  dist_since_fuel    metres since last fuel      [fuel stop]

Precedence when several limits bind at once: the cycle limit forces a 34-hour
restart; otherwise the 11h/14h limits force a 10-hour reset; otherwise the 8h
rule forces a 30-minute break; otherwise a fuel stop.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List

from . import geometry as geo
from .. import constants as C

EPS = 1e-6


@dataclass
class DutyEvent:
    """A single contiguous duty-status block on the timeline."""

    event_type: str          # semantic tag (DRIVE, FUEL, PICKUP, ...)
    status: str              # FMCSA duty status (DRIVING, OFF_DUTY, ...)
    start_hr: float          # absolute hours since trip start
    duration_hrs: float
    start_coord: List[float]  # [lon, lat] at the start of the block
    end_coord: List[float]    # [lon, lat] at the end of the block
    distance_mi: float = 0.0  # miles driven during this block (0 for stops)
    note: str = ""

    def to_dict(self) -> dict:
        return {
            "event_type": self.event_type,
            "status": self.status,
            "start_hr": round(self.start_hr, 4),
            "end_hr": round(self.start_hr + self.duration_hrs, 4),
            "duration_hrs": round(self.duration_hrs, 4),
            "start_coord": [round(self.start_coord[0], 6), round(self.start_coord[1], 6)],
            "end_coord": [round(self.end_coord[0], 6), round(self.end_coord[1], 6)],
            "distance_mi": round(self.distance_mi, 2),
            "note": self.note,
        }


@dataclass
class HOSSimulator:
    """Drive a :class:`~geometry.RouteTrack` while enforcing HOS rules."""

    track: geo.RouteTrack
    cycle_used_start: float  # driver's Current Cycle Used (Hrs) input

    # --- running state -----------------------------------------------------
    clock_hr: float = 0.0
    cum_dist_m: float = 0.0
    drive_since_rest: float = 0.0
    window_since_rest: float = 0.0
    drive_since_break: float = 0.0
    cycle_used: float = 0.0
    dist_since_fuel: float = 0.0
    events: List[DutyEvent] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.cycle_used = self.cycle_used_start

    # ------------------------------------------------------------------ #
    # Event emission helpers
    # ------------------------------------------------------------------ #
    def _coord_now(self) -> List[float]:
        return self.track.point_at(self.cum_dist_m)

    def _emit_stationary(self, event_type: str, status: str, hours: float, note: str = "") -> None:
        """Log a non-driving block that consumes time but no distance."""
        coord = self._coord_now()
        self.events.append(
            DutyEvent(
                event_type=event_type,
                status=status,
                start_hr=self.clock_hr,
                duration_hrs=hours,
                start_coord=coord,
                end_coord=coord,
                note=note,
            )
        )
        self.clock_hr += hours

        # Apply the block's effect on each clock.
        on_duty = status == C.STATUS_ON_DUTY
        resting = status in (C.STATUS_OFF_DUTY, C.STATUS_SLEEPER)

        if on_duty:
            # On-duty (not driving) counts toward the 14h window and cycle.
            self.window_since_rest += hours
            self.cycle_used += hours
        elif resting:
            if hours >= C.CYCLE_RESTART_HOURS - EPS:
                # 34h+ restart: full reset of every clock, cycle included.
                self.drive_since_rest = 0.0
                self.window_since_rest = 0.0
                self.drive_since_break = 0.0
                self.cycle_used = 0.0
            elif hours >= C.DAILY_RESET_HOURS - EPS:
                # 10h+ reset: resets the daily clocks but NOT the cycle.
                self.drive_since_rest = 0.0
                self.window_since_rest = 0.0
                self.drive_since_break = 0.0
            else:
                # A short (30-min) break: satisfies the 8h rule and counts
                # toward the 14h window, but does not reset drive/cycle.
                self.window_since_rest += hours
                self.drive_since_break = 0.0

    # ------------------------------------------------------------------ #
    # Rest injection
    # ------------------------------------------------------------------ #
    def _inject_cycle_restart(self) -> None:
        self._emit_stationary(
            C.EVENT_CYCLE_RESTART, C.STATUS_SLEEPER, C.CYCLE_RESTART_HOURS,
            note="34-hour cycle restart (70h limit reached)",
        )

    def _inject_daily_reset(self) -> None:
        self._emit_stationary(
            C.EVENT_DAILY_RESET, C.STATUS_SLEEPER, C.DAILY_RESET_HOURS,
            note="10-hour reset (11h/14h limit reached)",
        )

    def _inject_break(self) -> None:
        self._emit_stationary(
            C.EVENT_BREAK, C.STATUS_OFF_DUTY, C.SHORT_BREAK_HOURS,
            note="30-minute break (8h driving rule)",
        )

    def _inject_fuel(self) -> None:
        self._emit_stationary(
            C.EVENT_FUEL, C.STATUS_ON_DUTY, C.FUEL_HOURS,
            note="Fueling stop (every 1,000 mi)",
        )
        self.dist_since_fuel = 0.0

    # ------------------------------------------------------------------ #
    # Driving
    # ------------------------------------------------------------------ #
    def _drive_distance(self, distance_m: float, mph_mps: float) -> None:
        """Drive ``distance_m`` metres, interrupting for HOS/fuel as needed.

        ``mph_mps`` is this leg's speed in metres per driving-hour, used to
        convert freely between remaining distance and remaining drive time.
        """
        remaining = distance_m

        while remaining > EPS:
            # If any clock is already exhausted, service it before driving.
            if self.cycle_used >= C.CYCLE_LIMIT_HOURS - EPS:
                self._inject_cycle_restart()
                continue
            if (
                self.drive_since_rest >= C.MAX_DRIVE_HOURS - EPS
                or self.window_since_rest >= C.MAX_DUTY_WINDOW_HOURS - EPS
            ):
                self._inject_daily_reset()
                continue
            if self.drive_since_break >= C.DRIVE_BEFORE_BREAK_HOURS - EPS:
                self._inject_break()
                continue
            if self.dist_since_fuel >= C.FUEL_INTERVAL_METERS - EPS:
                self._inject_fuel()
                continue

            # Hours we may drive before the next interruption of any kind.
            hours_to_phase_end = remaining / mph_mps
            allow = min(
                C.MAX_DRIVE_HOURS - self.drive_since_rest,
                C.MAX_DUTY_WINDOW_HOURS - self.window_since_rest,
                C.DRIVE_BEFORE_BREAK_HOURS - self.drive_since_break,
                C.CYCLE_LIMIT_HOURS - self.cycle_used,
                (C.FUEL_INTERVAL_METERS - self.dist_since_fuel) / mph_mps,
                hours_to_phase_end,
            )
            allow = max(allow, 0.0)
            if allow <= EPS:
                # A limit is effectively binding; loop re-services it above.
                continue

            drive_m = allow * mph_mps
            start_coord = self._coord_now()
            self.cum_dist_m += drive_m
            end_coord = self._coord_now()

            self.events.append(
                DutyEvent(
                    event_type=C.EVENT_DRIVE,
                    status=C.STATUS_DRIVING,
                    start_hr=self.clock_hr,
                    duration_hrs=allow,
                    start_coord=start_coord,
                    end_coord=end_coord,
                    distance_mi=drive_m / C.METERS_PER_MILE,
                    note="Driving",
                )
            )

            self.clock_hr += allow
            self.drive_since_rest += allow
            self.window_since_rest += allow
            self.drive_since_break += allow
            self.cycle_used += allow
            self.dist_since_fuel += drive_m
            remaining -= drive_m

    # ------------------------------------------------------------------ #
    # Top-level trip driver
    # ------------------------------------------------------------------ #
    def run(self) -> List[DutyEvent]:
        """Execute the full trip and return the ordered event list."""
        pickup_dist = self.track.cum_dist[self.track.pickup_index]
        leg1_dist = pickup_dist
        leg2_dist = self.track.total_distance_m - pickup_dist

        # Split the ORS total drive time across the two legs by distance.
        total_dist = self.track.total_distance_m or 1.0
        total_hours = self.track.total_drive_hours or (total_dist / (55 * C.METERS_PER_MILE))
        mph_mps = total_dist / total_hours  # metres per driving-hour

        # 1) Pre-trip inspection (On-Duty, not driving).
        self._emit_stationary(
            C.EVENT_PRE_TRIP, C.STATUS_ON_DUTY, C.PRE_TRIP_HOURS,
            note="Pre-trip inspection",
        )

        # 2) Leg 1 — deadhead to the pickup.
        if leg1_dist > EPS:
            self._drive_distance(leg1_dist, mph_mps)

        # 3) Pickup — 1 hour On-Duty loading.
        self._emit_stationary(
            C.EVENT_PICKUP, C.STATUS_ON_DUTY, C.PICKUP_HOURS,
            note="Loading at pickup",
        )

        # 4) Leg 2 — loaded transit to the dropoff.
        if leg2_dist > EPS:
            self._drive_distance(leg2_dist, mph_mps)

        # 5) Dropoff — 1 hour On-Duty unloading.
        self._emit_stationary(
            C.EVENT_DROPOFF, C.STATUS_ON_DUTY, C.DROPOFF_HOURS,
            note="Unloading at dropoff",
        )

        return self.events
