"""
Regulatory + simulation constants.

All Hours-of-Service (HOS) numbers below encode the FMCSA property-carrying
driver rules for the 70-hour / 8-day cycle, as scoped by the assessment:

  * 11-hour driving limit
  * 14-hour on-duty driving window
  * 30-minute break required after 8 hours of driving
  * 70-hour / 8-day cycle limit
  * 10-hour daily reset, 34-hour cycle restart
"""

# --- HOS time limits (hours) ---------------------------------------------
MAX_DRIVE_HOURS = 11.0          # max driving after a 10h reset
MAX_DUTY_WINDOW_HOURS = 14.0    # absolute on-duty window after a 10h reset
DRIVE_BEFORE_BREAK_HOURS = 8.0  # driving allowed before a 30-min break
CYCLE_LIMIT_HOURS = 70.0        # 70h / 8-day on-duty ceiling

# --- Mandatory rest / break durations (hours) ----------------------------
DAILY_RESET_HOURS = 10.0        # off-duty reset for the 11h/14h clocks
CYCLE_RESTART_HOURS = 34.0      # off-duty restart for the 70h cycle
SHORT_BREAK_HOURS = 0.5         # the 30-minute break

# --- Fixed on-duty (not driving) events (hours) --------------------------
PRE_TRIP_HOURS = 0.25           # 15-minute pre-trip inspection
PICKUP_HOURS = 1.0              # loading at pickup
DROPOFF_HOURS = 1.0             # unloading at dropoff
FUEL_HOURS = 0.5               # 30-minute fueling stop

# --- Fueling ------------------------------------------------------------
FUEL_INTERVAL_MILES = 1000.0
METERS_PER_MILE = 1609.344
FUEL_INTERVAL_METERS = FUEL_INTERVAL_MILES * METERS_PER_MILE  # ~1,609,344 m

# --- Duty status codes (match the FMCSA grid rows, top -> bottom) --------
STATUS_OFF_DUTY = "OFF_DUTY"           # row 1
STATUS_SLEEPER = "SLEEPER_BERTH"       # row 2
STATUS_DRIVING = "DRIVING"             # row 3
STATUS_ON_DUTY = "ON_DUTY"             # row 4 (on-duty, not driving)

# --- Event types (semantic tags used by the frontend for markers) --------
EVENT_PRE_TRIP = "PRE_TRIP"
EVENT_DRIVE = "DRIVE"
EVENT_PICKUP = "PICKUP"
EVENT_DROPOFF = "DROPOFF"
EVENT_FUEL = "FUEL"
EVENT_BREAK = "BREAK_30MIN"
EVENT_DAILY_RESET = "DAILY_RESET_10H"
EVENT_CYCLE_RESTART = "CYCLE_RESTART_34H"

# Geometry simplification tolerance (degrees) for Douglas-Peucker.
# ~0.001 deg ≈ 100 m; keeps long routes light without visible distortion.
SIMPLIFY_TOLERANCE_DEG = 0.001
