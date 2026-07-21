import type { EventType, DutyStatus } from '../types';
import { EVENT_COLORS } from '../theme/theme';

/** Format a fractional-hour offset (e.g. 25.5) as "Day 2, 01:30". */
export function formatDayTime(hr: number): string {
  const day = Math.floor(hr / 24) + 1;
  const within = hr % 24;
  const h = Math.floor(within);
  const m = Math.round((within - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `Day ${day}, ${hh}:${mm}`;
}

/** Format a duration in hours as "2h 30m". */
export function formatDuration(hrs: number): string {
  const h = Math.floor(hrs);
  const m = Math.round((hrs - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const STATUS_LABELS: Record<DutyStatus, string> = {
  OFF_DUTY: 'Off Duty',
  SLEEPER_BERTH: 'Sleeper Berth',
  DRIVING: 'Driving',
  ON_DUTY: 'On Duty (Not Driving)',
};

interface EventMeta {
  label: string;
  color: string;
  short: string;
}

/** Human-facing metadata for each event type (labels + marker color). */
export const EVENT_META: Record<EventType, EventMeta> = {
  PRE_TRIP: { label: 'Pre-trip inspection', color: EVENT_COLORS.START, short: 'Start' },
  DRIVE: { label: 'Driving', color: '#0ea5e9', short: 'Drive' },
  PICKUP: { label: 'Pickup (loading)', color: EVENT_COLORS.PICKUP, short: 'Pickup' },
  DROPOFF: { label: 'Dropoff (unloading)', color: EVENT_COLORS.DROPOFF, short: 'Dropoff' },
  FUEL: { label: 'Fuel stop', color: EVENT_COLORS.FUEL, short: 'Fuel' },
  BREAK_30MIN: { label: '30-minute break', color: EVENT_COLORS.BREAK, short: 'Break' },
  DAILY_RESET_10H: { label: '10-hour reset', color: EVENT_COLORS.REST, short: 'Rest 10h' },
  CYCLE_RESTART_34H: { label: '34-hour restart', color: EVENT_COLORS.REST, short: 'Restart 34h' },
};
