import { create } from 'zustand';
import { simulateTrip } from '../api/client';
import type { SimulateRequest, SimulateResponse } from '../types';

interface TripState {
  loading: boolean;
  error: string | null;
  result: SimulateResponse | null;
  lastRequest: SimulateRequest | null;
  runSimulation: (payload: SimulateRequest) => Promise<void>;
  reset: () => void;
}

/**
 * Global trip store. Keeping the simulation result in a lightweight Zustand
 * store avoids prop-drilling it through the map / ELD / summary components.
 */
export const useTripStore = create<TripState>((set) => ({
  loading: false,
  error: null,
  result: null,
  lastRequest: null,

  runSimulation: async (payload) => {
    set({ loading: true, error: null, lastRequest: payload });
    try {
      const result = await simulateTrip(payload);
      set({ result, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Unknown error',
        loading: false,
        result: null,
      });
    }
  },

  reset: () => set({ result: null, error: null, lastRequest: null }),
}));
