"use client";

import { motion, AnimatePresence } from "motion/react";
import type { HistoryEntry } from "@/hooks/useBankerState";

const reasonText: Record<string, string> = {
  ok: "Schvaleno",
  exceeds_need: "Zamitnuto \u2014 presahuje potrebu",
  exceeds_available: "Zamitnuto \u2014 nedostatek prostredku",
  unsafe: "Zamitnuto \u2014 nebezpecny stav",
};

interface HistoryLogProps {
  entries: HistoryEntry[];
}

export function HistoryLog({ entries }: HistoryLogProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-amber-500 italic text-center py-4">
        Zatim zadne zadosti.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`rounded-lg border px-4 py-3 ${
              entry.approved
                ? "border-green-200 bg-green-50/80"
                : "border-red-200 bg-red-50/80"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  entry.approved ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900">
                    {entry.clientName}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0">
                    {entry.timestamp.toLocaleTimeString("cs-CZ")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">
                  Zadost o{" "}
                  <span className="font-semibold">
                    {entry.request.toLocaleString("cs-CZ")} Kc
                  </span>
                </p>
                <p
                  className={`text-xs font-medium mt-1 ${
                    entry.approved ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {reasonText[entry.reason] ?? entry.reason}
                </p>
                {entry.safeSequence && (
                  <p className="text-xs text-gray-500 mt-1">
                    Bezpecna posloupnost:{" "}
                    {entry.safeSequence.map((id) => `K${id + 1}`).join(" \u2192 ")}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
