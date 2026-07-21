import type { DutyStatus, TimelineEvent } from '../types';

/** A status segment within a single 24-hour day (hours are 0–24 local day). */
export interface DaySegment {
  status: DutyStatus;
  startHr: number; // 0–24 within the day
  endHr: number; // 0–24 within the day
  eventType: TimelineEvent['event_type'];
  note: string;
  locationLabel: string;
  absoluteStartHr: number; // original offset from trip start
}

export interface DaySheet {
  dayIndex: number; // 0-based
  segments: DaySegment[];
  // Remarks = status changes that begin within this day.
  remarks: Array<{
    time: string; // HH:MM
    status: DutyStatus;
    location: string;
    note: string;
  }>;
  // Hours accumulated per status for this day's totals column.
  totals: Record<DutyStatus, number>;
}

const STATUS_ORDER: DutyStatus[] = [
  'OFF_DUTY',
  'SLEEPER_BERTH',
  'DRIVING',
  'ON_DUTY',
];

function hhmm(hrWithinDay: number): string {
  const h = Math.floor(hrWithinDay) % 24;
  const m = Math.round((hrWithinDay - Math.floor(hrWithinDay)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Split a flat timeline into per-day sheets.
 *
 * Every event carries an absolute [start_hr, end_hr) offset from trip start.
 * An event spanning a midnight boundary (e.g. hour 20 → 30) is cut at each
 * 24-hour line so the first sheet draws 20→24 and the next draws 0→6.
 */
export function buildDaySheets(events: TimelineEvent[]): DaySheet[] {
  if (events.length === 0) return [];

  const totalHours = events[events.length - 1].end_hr;
  const numDays = Math.max(1, Math.ceil(totalHours / 24 - 1e-9));

  const sheets: DaySheet[] = Array.from({ length: numDays }, (_, dayIndex) => ({
    dayIndex,
    segments: [],
    remarks: [],
    totals: {
      OFF_DUTY: 0,
      SLEEPER_BERTH: 0,
      DRIVING: 0,
      ON_DUTY: 0,
    },
  }));

  for (const ev of events) {
    let cursor = ev.start_hr;
    const end = ev.end_hr;
    let isFirstChunk = true;

    while (cursor < end - 1e-9) {
      const dayIndex = Math.floor(cursor / 24 + 1e-9);
      const dayStart = dayIndex * 24;
      const dayEnd = dayStart + 24;
      const chunkEnd = Math.min(end, dayEnd);

      const sheet = sheets[dayIndex];
      if (sheet) {
        const startWithin = cursor - dayStart;
        const endWithin = chunkEnd - dayStart;
        sheet.segments.push({
          status: ev.status,
          startHr: startWithin,
          endHr: endWithin,
          eventType: ev.event_type,
          note: ev.note,
          locationLabel: ev.location_label,
          absoluteStartHr: ev.start_hr,
        });
        sheet.totals[ev.status] += endWithin - startWithin;

        // Only the first chunk of an event records a remark (the status change).
        if (isFirstChunk) {
          sheet.remarks.push({
            time: hhmm(startWithin),
            status: ev.status,
            location: ev.location_label,
            note: ev.note,
          });
        }
      }

      cursor = chunkEnd;
      isFirstChunk = false;
    }
  }

  return sheets;
}

export { STATUS_ORDER };
