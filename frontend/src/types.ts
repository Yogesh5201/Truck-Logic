// Shared types mirroring the Django backend response contract.

export type DutyStatus =
  | 'OFF_DUTY'
  | 'SLEEPER_BERTH'
  | 'DRIVING'
  | 'ON_DUTY';

export type EventType =
  | 'PRE_TRIP'
  | 'DRIVE'
  | 'PICKUP'
  | 'DROPOFF'
  | 'FUEL'
  | 'BREAK_30MIN'
  | 'DAILY_RESET_10H'
  | 'CYCLE_RESTART_34H';

/** One contiguous duty-status block on the timeline. */
export interface TimelineEvent {
  event_type: EventType;
  status: DutyStatus;
  start_hr: number;
  end_hr: number;
  duration_hrs: number;
  start_coord: [number, number]; // [lon, lat]
  end_coord: [number, number];
  distance_mi: number;
  note: string;
  location_label: string;
}

export interface TripSummary {
  total_distance_mi: number;
  total_duration_hr: number;
  driving_hr: number;
  on_duty_hr: number;
  rest_hr: number;
  cycle_used_start: number;
  cycle_available_start: number;
  num_fuel_stops: number;
  num_daily_resets: number;
  num_cycle_restarts: number;
  num_breaks: number;
  num_log_sheets: number;
}

export interface RouteGeometry {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Record<string, unknown>;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][]; // [lon, lat]
    };
  }>;
}

export interface Waypoint {
  coord: [number, number]; // [lon, lat]
  label: string;
}

export interface SimulateResponse {
  trip_summary: TripSummary;
  route_geometry: RouteGeometry;
  timeline_events: TimelineEvent[];
  waypoints: {
    current: Waypoint;
    pickup: Waypoint;
    dropoff: Waypoint;
  };
}

export interface SimulateRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}
