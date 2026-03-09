"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

interface Coin {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export function FloatingCoins({ count = 15 }: { count?: number }) {
  const coins = useMemo<Coin[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 12 + Math.random() * 20,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {coins.map((coin) => (
        <motion.div
          key={coin.id}
          className="absolute text-amber-300/20"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
            fontSize: coin.size,
          }}
          animate={{
            y: [0, -30, 10, -20, 0],
            x: [0, 15, -10, 5, 0],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.3, 0.15, 0.25, 0.1],
          }}
          transition={{
            duration: coin.duration,
            delay: coin.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          💰
        </motion.div>
      ))}
    </div>
  );
}
