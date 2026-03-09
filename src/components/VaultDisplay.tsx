"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "./AnimatedNumber";
import { Landmark } from "lucide-react";

interface VaultDisplayProps {
  available: number;
  total: number;
}

export function VaultDisplay({ available, total }: VaultDisplayProps) {
  const percentage = total > 0 ? (available / total) * 100 : 0;

  return (
    <motion.div
      layout
      className="bg-gradient-to-br from-amber-100 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-lg text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="inline-block mb-3"
      >
        <Landmark className="h-12 w-12 text-amber-700" />
      </motion.div>
      <h2 className="text-lg font-semibold text-amber-800 mb-1">Trezor banky</h2>
      <div className="text-3xl font-bold text-amber-900">
        <AnimatedNumber value={available} suffix=" Kč" />
      </div>
      <p className="text-sm text-amber-600 mt-1">
        z celkových {total.toLocaleString("cs-CZ")} Kč
      </p>
      <div className="mt-3 h-3 bg-amber-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        />
      </div>
    </motion.div>
  );
}
