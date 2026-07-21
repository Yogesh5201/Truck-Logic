"""
Unit tests for the HOS temporal projection engine.

These tests build synthetic straight-line routes with a controlled distance
and driving duration, so we can assert the finite state machine injects the
correct rests, breaks, fuel stops and cycle restarts — independent of ORS.
"""

from django.test import SimpleTestCase

from trip_planner import constants as C
from trip_planner.services import geometry as geo
from trip_planner.services.hos_engine import HOSSimulator


def make_track(
    distance_mi: float,
    avg_mph: float = 55.0,
    pickup_fraction: float = 0.5,
    edges: int = 200,
) -> geo.RouteTrack:
    """Build a synthetic track with an *exact* distance and average speed.

    The engine measures driving distance from geometry (haversine per edge)
    and time from the apportioned ORS duration, so we construct the
    :class:`RouteTrack` directly with controlled ``edge_dist`` / ``edge_dur``
    rather than relying on real-world coordinates to yield a precise mileage.

    ``pickup_index`` is placed at ``pickup_fraction`` so both legs run.
    Coordinates are a simple straight line purely to support interpolation.
    """
    total_m = distance_mi * C.METERS_PER_MILE
    total_hr = distance_mi / avg_mph

    edge_dist = [total_m / edges] * edges
    edge_dur = [total_hr / edges] * edges

    # Straight west-bound line of (edges + 1) vertices for point_at().
    coords = [[-90.0 - (10.0 * i / edges), 40.0] for i in range(edges + 1)]

    pickup_index = max(1, int(edges * pickup_fraction))
    return geo.RouteTrack(coords, edge_dist, edge_dur, pickup_index)


class DrivingLimitTests(SimpleTestCase):
    def test_short_trip_no_rest(self):
        """A ~2h trip needs no 10h reset, break, or fuel stop."""
        track = make_track(distance_mi=100, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=0.0).run()
        types = [e.event_type for e in events]
        self.assertNotIn(C.EVENT_DAILY_RESET, types)
        self.assertNotIn(C.EVENT_CYCLE_RESTART, types)
        self.assertNotIn(C.EVENT_FUEL, types)
        # Must always contain pre-trip, pickup, dropoff.
        self.assertIn(C.EVENT_PRE_TRIP, types)
        self.assertIn(C.EVENT_PICKUP, types)
        self.assertIn(C.EVENT_DROPOFF, types)

    def test_eight_hour_break_injected(self):
        """Driving 8h+ triggers a 30-minute break."""
        # ~9h of driving at 55mph -> ~495 mi. Under 11h so no reset.
        track = make_track(distance_mi=495, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=0.0).run()
        breaks = [e for e in events if e.event_type == C.EVENT_BREAK]
        self.assertGreaterEqual(len(breaks), 1)
        self.assertAlmostEqual(breaks[0].duration_hrs, C.SHORT_BREAK_HOURS)

    def test_eleven_hour_drive_forces_daily_reset(self):
        """More than 11h of driving forces a 10h reset."""
        # 13h of driving at 55 mph -> 715 mi.
        track = make_track(distance_mi=715, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=0.0).run()
        resets = [e for e in events if e.event_type == C.EVENT_DAILY_RESET]
        self.assertGreaterEqual(len(resets), 1)
        self.assertAlmostEqual(resets[0].duration_hrs, C.DAILY_RESET_HOURS)

        # No single driving block may exceed the 11h limit.
        for e in events:
            if e.status == C.STATUS_DRIVING:
                self.assertLessEqual(e.duration_hrs, C.MAX_DRIVE_HOURS + 1e-6)

    def test_driving_never_exceeds_daily_totals(self):
        """Between two resets, cumulative driving <= 11h and window <= 14h."""
        track = make_track(distance_mi=1500, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=0.0).run()

        drive_since_rest = 0.0
        window_since_rest = 0.0
        for e in events:
            if e.event_type in (C.EVENT_DAILY_RESET, C.EVENT_CYCLE_RESTART):
                drive_since_rest = 0.0
                window_since_rest = 0.0
                continue
            if e.status == C.STATUS_DRIVING:
                drive_since_rest += e.duration_hrs
                window_since_rest += e.duration_hrs
            elif e.status == C.STATUS_ON_DUTY:
                window_since_rest += e.duration_hrs
            elif e.status == C.STATUS_OFF_DUTY:
                window_since_rest += e.duration_hrs
            self.assertLessEqual(round(drive_since_rest, 4), C.MAX_DRIVE_HOURS + 1e-3)
            self.assertLessEqual(round(window_since_rest, 4), C.MAX_DUTY_WINDOW_HOURS + 1e-3)


class FuelTests(SimpleTestCase):
    def test_fuel_stop_every_1000_miles(self):
        """A 2,400-mile trip needs at least two fuel stops."""
        track = make_track(distance_mi=2400, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=0.0).run()
        fuels = [e for e in events if e.event_type == C.EVENT_FUEL]
        self.assertGreaterEqual(len(fuels), 2)
        for f in fuels:
            self.assertAlmostEqual(f.duration_hrs, C.FUEL_HOURS)


class CycleRestartTests(SimpleTestCase):
    def test_cycle_almost_exhausted_forces_34h_restart(self):
        """Cused=68 -> 2h available -> drive ~2h, then a 34h restart.

        This is the marquee edge case from the PRD.
        """
        # Long trip so the 2h available cannot possibly complete it.
        track = make_track(distance_mi=1200, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=68.0).run()

        restarts = [e for e in events if e.event_type == C.EVENT_CYCLE_RESTART]
        self.assertGreaterEqual(len(restarts), 1)
        self.assertAlmostEqual(restarts[0].duration_hrs, C.CYCLE_RESTART_HOURS)

        # Driving hours before the first restart (incl. the 0.25h pre-trip
        # on-duty which also counts to the cycle) should be about 2h of drive.
        drive_before = 0.0
        for e in events:
            if e.event_type == C.EVENT_CYCLE_RESTART:
                break
            if e.status == C.STATUS_DRIVING:
                drive_before += e.duration_hrs
        # 68 used + 0.25 pre-trip => ~1.75h of drive available before 70h hit.
        self.assertLessEqual(drive_before, 2.0 + 1e-3)
        self.assertGreater(drive_before, 0.0)

    def test_restart_resets_cycle(self):
        """After a 34h restart the sim can keep driving to completion."""
        track = make_track(distance_mi=1200, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=68.0).run()
        # Trip must still reach the dropoff after restart(s).
        self.assertEqual(events[-1].event_type, C.EVENT_DROPOFF)


class TimelineIntegrityTests(SimpleTestCase):
    def test_events_are_contiguous_in_time(self):
        """Each event starts exactly when the previous one ends."""
        track = make_track(distance_mi=900, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=10.0).run()
        for prev, nxt in zip(events, events[1:]):
            self.assertAlmostEqual(
                prev.start_hr + prev.duration_hrs, nxt.start_hr, places=5
            )

    def test_trip_starts_with_pretrip_and_ends_with_dropoff(self):
        track = make_track(distance_mi=300, avg_mph=55)
        events = HOSSimulator(track=track, cycle_used_start=0.0).run()
        self.assertEqual(events[0].event_type, C.EVENT_PRE_TRIP)
        self.assertEqual(events[-1].event_type, C.EVENT_DROPOFF)
