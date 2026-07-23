import { create } from 'zustand';
import { simulateTrip, ApiError } from '../api/client';
import type { SimulateRequest, SimulateResponse } from '../types';

interface TripState {
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  result: SimulateResponse | null;
  lastRequest: SimulateRequest | null;
  runSimulation: (payload: SimulateRequest) => Promise<boolean>;
  reset: () => void;
}

/**
 * Global trip store. Keeping the simulation result in a lightweight Zustand
 * store avoids prop-drilling it through the map / ELD / summary components.
 * runSimulation resolves to a boolean so callers (e.g. the form) can trigger
 * a toast on success/failure without subscribing to store internals.
 */
export const useTripStore = create<TripState>((set) => ({
  loading: false,
  error: null,
  errorCode: null,
  result: null,
  lastRequest: null,

  runSimulation: async (payload) => {
    set({ loading: true, error: null, errorCode: null, lastRequest: payload });
    try {
      const result = await simulateTrip(payload);
      set({ result, loading: false });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      const code = err instanceof ApiError ? err.code : 'error';
      set({ error: message, errorCode: code, loading: false, result: null });
      return false;
    }
  },

  reset: () =>
    set({ result: null, error: null, errorCode: null, lastRequest: null }),
}));
