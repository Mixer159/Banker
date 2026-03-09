"use client";

import { useReducer, useCallback } from "react";
import {
  Client,
  RouteResult,
  createClient,
  validateSetup,
  findShortestRoute,
} from "@/lib/banker";

// --- Types ---

export type Phase = "setup" | "route";

export interface BankerState {
  totalResources: number;
  available: number;
  clients: Client[];
  phase: Phase;
  routeResult: RouteResult | null;
  error: string | null;
}

type Action =
  | { type: "SET_TOTAL"; total: number }
  | { type: "ADD_CLIENT"; max: number }
  | { type: "REMOVE_CLIENT"; id: number }
  | { type: "UPDATE_CLIENT"; id: number; max: number }
  | { type: "START_ROUTE" }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: BankerState = {
  totalResources: 0,
  available: 0,
  clients: [],
  phase: "setup",
  routeResult: null,
  error: null,
};

function reducer(state: BankerState, action: Action): BankerState {
  switch (action.type) {
    case "SET_TOTAL": {
      const sumAlloc = state.clients.reduce((s, c) => s + c.allocated, 0);
      return {
        ...state,
        totalResources: action.total,
        available: action.total - sumAlloc,
        error: null,
      };
    }

    case "ADD_CLIENT": {
      if (state.clients.length >= 4) return state;
      const newClient = createClient(state.clients.length, action.max, 0);
      const newClients = [...state.clients, newClient];
      return {
        ...state,
        clients: newClients,
        available: state.totalResources,
        error: null,
      };
    }

    case "REMOVE_CLIENT": {
      const filtered = state.clients
        .filter((c) => c.id !== action.id)
        .map((c, i) => createClient(i, c.max, 0));
      return {
        ...state,
        clients: filtered,
        available: state.totalResources,
        error: null,
      };
    }

    case "UPDATE_CLIENT": {
      const updatedClients = state.clients.map((c) =>
        c.id === action.id ? createClient(c.id, action.max, 0) : c
      );
      return {
        ...state,
        clients: updatedClients,
        available: state.totalResources,
        error: null,
      };
    }

    case "START_ROUTE": {
      const validation = validateSetup(state.totalResources, state.clients);
      if (!validation.valid) {
        return { ...state, error: validation.error ?? "Neplatný vstup." };
      }
      const routeResult = findShortestRoute(state.totalResources, state.clients);
      if (!routeResult.possible) {
        return { ...state, error: "Nelze najít cestu — některý klient potřebuje více než celkové prostředky." };
      }
      return { ...state, phase: "route", error: null, routeResult };
    }

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
    (max: number) => dispatch({ type: "ADD_CLIENT", max }),
    []
  );
  const removeClient = useCallback(
    (id: number) => dispatch({ type: "REMOVE_CLIENT", id }),
    []
  );
  const updateClient = useCallback(
    (id: number, max: number) =>
      dispatch({ type: "UPDATE_CLIENT", id, max }),
    []
  );
  const startRoute = useCallback(
    () => dispatch({ type: "START_ROUTE" }),
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
    startRoute,
    setError,
    reset,
  };
}
