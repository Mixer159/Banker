"use client";

import { AnimatePresence, motion } from "motion/react";
import { useBankerState } from "@/hooks/useBankerState";
import { SetupPhase } from "@/components/SetupPhase";
import { RouteVisualization } from "@/components/RouteVisualization";
import { FloatingCoins } from "@/components/FloatingCoins";

export default function Home() {
  const {
    state,
    setTotal,
    addClient,
    removeClient,
    updateClient,
    startRoute,
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
            error={state.error}
            onSetTotal={setTotal}
            onAddClient={addClient}
            onRemoveClient={removeClient}
            onUpdateClient={updateClient}
            onStart={startRoute}
          />
        )}
        {state.phase === "route" && state.routeResult && (
          <RouteVisualization
            key="route"
            routeResult={state.routeResult}
            clients={state.clients}
            totalResources={state.totalResources}
            onReset={reset}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
