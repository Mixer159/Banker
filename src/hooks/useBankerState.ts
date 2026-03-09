"use client";

import { useReducer, useCallback } from "react";
import {
  Client,
  SafetyResult,
  createClient,
  processRequest,
  validateSetup,
  runSafetyCheck,
} from "@/lib/banker";

// --- Types ---

export interface HistoryEntry {
  id: number;
  clientId: number;
  clientName: string;
  request: number;
  approved: boolean;
  reason: string;
  safeSequence?: number[];
  timestamp: Date;
}

export type Phase = "setup" | "simulation" | "safety-check";

export interface BankerState {
  totalResources: number;
  available: number;
  clients: Client[];
  phase: Phase;
  setupStep: number;
  safetyResult: SafetyResult | null;
  history: HistoryEntry[];
  error: string | null;
  pendingRequest: { clientIndex: number; amount: number } | null;
}

type Action =
  | { type: "SET_TOTAL"; total: number }
  | { type: "ADD_CLIENT"; max: number; allocated: number }
  | { type: "REMOVE_CLIENT"; id: number }
  | { type: "UPDATE_CLIENT"; id: number; max: number; allocated: number }
  | { type: "START_SIMULATION" }
  | { type: "SUBMIT_REQUEST"; clientIndex: number; amount: number }
  | { type: "SHOW_SAFETY_CHECK" }
  | { type: "COMPLETE_SAFETY_CHECK" }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: BankerState = {
  totalResources: 0,
  available: 0,
  clients: [],
  phase: "setup",
  setupStep: 0,
  safetyResult: null,
  history: [],
  error: null,
  pendingRequest: null,
};

function reducer(state: BankerState, action: Action): BankerState {
  switch (action.type) {
    case "SET_TOTAL":
      return { ...state, totalResources: action.total, error: null };

    case "ADD_CLIENT": {
      if (state.clients.length >= 4) return state;
      const newClient = createClient(
        state.clients.length,
        action.max,
        action.allocated
      );
      const newClients = [...state.clients, newClient];
      const sumAlloc = newClients.reduce((s, c) => s + c.allocated, 0);
      return {
        ...state,
        clients: newClients,
        available: state.totalResources - sumAlloc,
        error: null,
      };
    }

    case "REMOVE_CLIENT": {
      const filtered = state.clients
        .filter((c) => c.id !== action.id)
        .map((c, i) => createClient(i, c.max, c.allocated));
      const sumAlloc = filtered.reduce((s, c) => s + c.allocated, 0);
      return {
        ...state,
        clients: filtered,
        available: state.totalResources - sumAlloc,
        error: null,
      };
    }

    case "UPDATE_CLIENT": {
      const updatedClients = state.clients.map((c) =>
        c.id === action.id
          ? createClient(c.id, action.max, action.allocated)
          : c
      );
      const sumAlloc = updatedClients.reduce((s, c) => s + c.allocated, 0);
      return {
        ...state,
        clients: updatedClients,
        available: state.totalResources - sumAlloc,
        error: null,
      };
    }

    case "START_SIMULATION": {
      const validation = validateSetup(state.totalResources, state.clients);
      if (!validation.valid) {
        return { ...state, error: validation.error ?? "Neplatny vstup." };
      }
      const initialSafety = runSafetyCheck(state.available, state.clients);
      return {
        ...state,
        phase: "simulation",
        error: null,
        safetyResult: initialSafety,
      };
    }

    case "SUBMIT_REQUEST": {
      const { clientIndex, amount } = action;
      const { result, newAvailable, newClients } = processRequest(
        clientIndex,
        amount,
        state.available,
        state.clients
      );
      const entry: HistoryEntry = {
        id: state.history.length,
        clientId: state.clients[clientIndex].id,
        clientName: state.clients[clientIndex].name,
        request: amount,
        approved: result.approved,
        reason: result.reason,
        safeSequence: result.safetyResult?.safe
          ? result.safetyResult.sequence
          : undefined,
        timestamp: new Date(),
      };
      return {
        ...state,
        available: newAvailable,
        clients: newClients,
        safetyResult: result.safetyResult ?? state.safetyResult,
        history: [entry, ...state.history],
        pendingRequest: { clientIndex, amount },
        phase: "safety-check",
      };
    }

    case "COMPLETE_SAFETY_CHECK":
      return {
        ...state,
        phase: "simulation",
        pendingRequest: null,
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export function useBankerState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setTotal = useCallback(
    (total: number) => dispatch({ type: "SET_TOTAL", total }),
    []
  );
  const addClient = useCallback(
    (max: number, allocated: number) =>
      dispatch({ type: "ADD_CLIENT", max, allocated }),
    []
  );
  const removeClient = useCallback(
    (id: number) => dispatch({ type: "REMOVE_CLIENT", id }),
    []
  );
  const updateClient = useCallback(
    (id: number, max: number, allocated: number) =>
      dispatch({ type: "UPDATE_CLIENT", id, max, allocated }),
    []
  );
  const startSimulation = useCallback(
    () => dispatch({ type: "START_SIMULATION" }),
    []
  );
  const submitRequest = useCallback(
    (clientIndex: number, amount: number) =>
      dispatch({ type: "SUBMIT_REQUEST", clientIndex, amount }),
    []
  );
  const completeSafetyCheck = useCallback(
    () => dispatch({ type: "COMPLETE_SAFETY_CHECK" }),
    []
  );
  const setError = useCallback(
    (error: string | null) => dispatch({ type: "SET_ERROR", error }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    setTotal,
    addClient,
    removeClient,
    updateClient,
    startSimulation,
    submitRequest,
    completeSafetyCheck,
    setError,
    reset,
  };
}
