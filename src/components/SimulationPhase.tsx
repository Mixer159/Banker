"use client";

import { motion } from "motion/react";
import { RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultDisplay } from "./VaultDisplay";
import { ClientCard } from "./ClientCard";
import { StateTable } from "./StateTable";
import { RequestForm } from "./RequestForm";
import { HistoryLog } from "./HistoryLog";
import type { Client, SafetyResult } from "@/lib/banker";
import type { HistoryEntry } from "@/hooks/useBankerState";

interface SimulationPhaseProps {
  totalResources: number;
  available: number;
  clients: Client[];
  safetyResult: SafetyResult | null;
  history: HistoryEntry[];
  onSubmitRequest: (clientIndex: number, amount: number) => void;
  onReset: () => void;
}

export function SimulationPhase({
  totalResources,
  available,
  clients,
  safetyResult,
  history,
  onSubmitRequest,
  onReset,
}: SimulationPhaseProps) {
  const isSafe = safetyResult?.safe ?? true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold text-amber-900 sm:text-4xl">
            <span className="mr-2">{"\u{1F3E6}"}</span>Simulace
          </h1>
          <p className="text-sm text-amber-600 mt-1">
            Bankéřův algoritmus — interaktivní simulace
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            onClick={onReset}
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <RotateCcw className="size-4" />
            Nová simulace
          </Button>
        </motion.div>
      </div>

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <VaultDisplay available={available} total={totalResources} />
          <RequestForm clients={clients} onSubmit={onSubmitRequest} />

          {/* Safety status indicator */}
          <motion.div
            layout
            className={`rounded-xl border-2 p-4 flex items-center gap-3 ${
              isSafe
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            {isSafe ? (
              <ShieldCheck className="size-6 text-green-600 shrink-0" />
            ) : (
              <ShieldX className="size-6 text-red-600 shrink-0" />
            )}
            <div>
              <p
                className={`font-semibold text-sm ${
                  isSafe ? "text-green-800" : "text-red-800"
                }`}
              >
                {isSafe ? "Bezpečný stav" : "Nebezpečný stav"}
              </p>
              {isSafe && safetyResult?.sequence && (
                <p className="text-xs text-green-600 mt-0.5">
                  {safetyResult.sequence.map((id) => `K${id + 1}`).join(" \u2192 ")}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Center + Right columns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Client cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>

          {/* State table */}
          <StateTable clients={clients} available={available} />

          {/* History */}
          <div>
            <h2 className="text-lg font-semibold text-amber-900 mb-3">
              Historie žádostí
            </h2>
            <HistoryLog entries={history} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
