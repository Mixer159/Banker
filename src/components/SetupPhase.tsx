"use client";

import { motion, AnimatePresence } from "motion/react";
import { Plus, Play, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { NumberInput } from "@/components/NumberInput";
import { ClientCardSetup } from "@/components/ClientCardSetup";
import type { Client } from "@/lib/banker";

interface SetupPhaseProps {
  totalResources: number;
  clients: Client[];
  available: number;
  error: string | null;
  onSetTotal: (total: number) => void;
  onAddClient: (max: number, allocated: number) => void;
  onRemoveClient: (id: number) => void;
  onUpdateClient: (id: number, max: number, allocated: number) => void;
  onStart: () => void;
}

export function SetupPhase({
  totalResources,
  clients,
  available,
  error,
  onSetTotal,
  onAddClient,
  onRemoveClient,
  onUpdateClient,
  onStart,
}: SetupPhaseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-10 text-center"
      >
        <h1 className="text-4xl font-bold text-amber-900 sm:text-5xl">
          <span className="mr-2">🏦</span>Bankéřův Algoritmus
        </h1>
        <p className="mt-3 text-lg text-amber-700">
          Interaktivní vizualizace přidělování prostředků
        </p>
      </motion.div>

      {/* Total Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="mb-10 rounded-2xl border border-amber-200 bg-white/70 p-6 backdrop-blur"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
          >
            <Coins className="size-7 text-amber-600" />
          </motion.div>
          <h2 className="text-xl font-semibold text-amber-900">
            Celkové prostředky banky
          </h2>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="total-resources" className="text-amber-800">
              Celkové prostředky (Kč)
            </Label>
            <NumberInput
              id="total-resources"
              value={totalResources}
              onChange={onSetTotal}
              placeholder="např. 20 000 000"
              className="border-amber-200 text-lg focus-visible:border-amber-400 focus-visible:ring-amber-200"
            />
          </div>
          {totalResources > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2"
            >
              <span className="text-sm font-medium text-amber-700">Dostupné:</span>
              <AnimatedNumber
                value={available}
                suffix=" Kč"
                className="text-xl font-bold text-amber-900"
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Client Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mb-10"
      >
        <h2 className="mb-4 text-xl font-semibold text-amber-900">
          Klienti banky
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {clients.map((client) => (
              <ClientCardSetup
                key={client.id}
                id={client.id}
                name={client.name}
                max={client.max}
                onChangeMax={(val) =>
                  onUpdateClient(client.id, val, 0)
                }
                onRemove={() => onRemoveClient(client.id)}
              />
            ))}
          </AnimatePresence>

          {/* Add Client Button */}
          {clients.length < 4 && (
            <motion.button
              layout
              onClick={() => onAddClient(0, 0)}
              className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 text-amber-600 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="size-8" />
              <span className="text-sm font-medium">Přidat klienta</span>
              <span className="text-xs text-amber-400">
                {clients.length}/4
              </span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: 1,
              x: [0, -6, 6, -4, 4, -2, 2, 0],
            }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.4 }}
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <Button
          onClick={onStart}
          disabled={clients.length === 0 || totalResources <= 0}
          className="h-12 gap-2 rounded-xl bg-amber-600 px-8 text-base font-semibold text-white shadow-lg transition-all hover:bg-amber-700 hover:shadow-xl disabled:opacity-50"
        >
          <Play className="size-5" />
          Spustit simulaci
        </Button>
      </motion.div>
    </motion.div>
  );
}
