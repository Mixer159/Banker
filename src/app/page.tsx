"use client";

import { AnimatePresence } from "motion/react";
import { useBankerState } from "@/hooks/useBankerState";
import { SetupPhase } from "@/components/SetupPhase";
import { SimulationPhase } from "@/components/SimulationPhase";

export default function Home() {
  const {
    state,
    setTotal,
    addClient,
    removeClient,
    updateClient,
    startSimulation,
    submitRequest,
    completeSafetyCheck,
    reset,
    setError,
  } = useBankerState();

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {state.phase === "setup" && (
          <SetupPhase
            key="setup"
            totalResources={state.totalResources}
            clients={state.clients}
            available={state.available}
            error={state.error}
            onSetTotal={setTotal}
            onAddClient={addClient}
            onRemoveClient={removeClient}
            onUpdateClient={updateClient}
            onStart={startSimulation}
          />
        )}
        {(state.phase === "simulation" || state.phase === "safety-check") && (
          <SimulationPhase
            key="simulation"
            totalResources={state.totalResources}
            available={state.available}
            clients={state.clients}
            safetyResult={state.safetyResult}
            history={state.history}
            onSubmitRequest={submitRequest}
            onReset={reset}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
