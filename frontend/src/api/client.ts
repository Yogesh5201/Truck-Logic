import type { SimulateRequest, SimulateResponse } from '../types';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000/api/v1';

/** A routing/validation error with a friendly, user-facing message. */
export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

// Friendly copy for the machine codes the backend returns.
const FRIENDLY: Record<string, string> = {
  invalid_api_key:
    'The routing service rejected the API key. Please check the server configuration.',
  rate_limited:
    'The routing service is busy right now. Please wait a moment and try again.',
  network_error:
    'We couldn’t reach the routing service. Check your connection and retry.',
  no_route_found:
    'No drivable route was found between those locations. Try nearby addresses.',
  geocoding_failed:
    'One of the locations couldn’t be found. Try a more specific address.',
};

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
    throw new ApiError(
      'We couldn’t reach the routing service. Is the backend running?',
      'network_error',
    );
  }

  if (!resp.ok) {
    let detail = `Request failed (${resp.status}).`;
    let code = 'error';
    try {
      const body = await resp.json();
      if (body.code && FRIENDLY[body.code]) {
        detail = FRIENDLY[body.code];
        code = body.code;
      } else if (body.detail) {
        detail = body.detail;
      } else if (typeof body === 'object' && body !== null) {
        // DRF field validation error, e.g. { current_cycle_used: ["..."] }.
        const firstKey = Object.keys(body)[0];
        const firstErr = Array.isArray(body[firstKey])
          ? body[firstKey][0]
          : body[firstKey];
        if (firstErr) {
          detail = `${humanizeField(firstKey)}: ${firstErr}`;
          code = 'validation';
        }
      }
    } catch {
      /* keep default detail */
    }
    throw new ApiError(detail, code);
  }

  return (await resp.json()) as SimulateResponse;
}

function humanizeField(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
