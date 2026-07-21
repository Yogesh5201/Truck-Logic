import type { SimulateRequest, SimulateResponse } from '../types';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api/v1';

/** POST the trip inputs to the Django backend and return the simulation. */
export async function simulateTrip(
  payload: SimulateRequest,
): Promise<SimulateResponse> {
  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/simulate-trip/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      'Could not reach the routing service. Is the backend running?',
    );
  }

  if (!resp.ok) {
    // Surface DRF validation errors and upstream failures cleanly.
    let detail = `Request failed (${resp.status}).`;
    try {
      const body = await resp.json();
      if (body.detail) {
        detail = body.detail;
      } else if (typeof body === 'object') {
        const firstKey = Object.keys(body)[0];
        const firstErr = Array.isArray(body[firstKey])
          ? body[firstKey][0]
          : body[firstKey];
        if (firstErr) detail = `${firstKey}: ${firstErr}`;
      }
    } catch {
      /* keep the default detail */
    }
    throw new Error(detail);
  }

  return (await resp.json()) as SimulateResponse;
}
