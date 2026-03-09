"use client";

import { AnimatePresence, motion } from "motion/react";
import { useBankerState } from "@/hooks/useBankerState";
import { SetupPhase } from "@/components/SetupPhase";
import { SimulationPhase } from "@/components/SimulationPhase";
import { SafetyCheckOverlay } from "@/components/SafetyCheckOverlay";
import { FloatingCoins } from "@/components/FloatingCoins";

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
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 -z-10"
        animate={{
          background: [
            "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
            "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FFFBEB 100%)",
            "linear-gradient(135deg, #FDE68A 0%, #FFFBEB 50%, #FEF3C7 100%)",
            "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <FloatingCoins />

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

      <AnimatePresence>
        {state.phase === "safety-check" && state.safetyResult && (
          <SafetyCheckOverlay
            safetyResult={state.safetyResult}
            clients={state.clients}
            available={state.available}
            pendingRequest={state.pendingRequest}
            onComplete={completeSafetyCheck}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
