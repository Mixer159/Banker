"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "./AnimatedNumber";
import type { Client } from "@/lib/banker";

type ClientStatus = "idle" | "happy" | "worried" | "celebrating";

interface ClientCardProps {
  client: Client;
  isHighlighted?: boolean;
  status?: ClientStatus;
}

const statusEmoji: Record<ClientStatus, string> = {
  idle: "\u{1F9D1}",
  happy: "\u{1F60A}",
  worried: "\u{1F61F}",
  celebrating: "\u{1F389}",
};

export function ClientCard({
  client,
  isHighlighted = false,
  status = "idle",
}: ClientCardProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const percentage = client.max > 0 ? (client.allocated / client.max) * 100 : 0;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateY(((x - centerX) / centerX) * 6);
    setRotateX(((centerY - y) / centerY) * 6);
  }

  function handleMouseLeave() {
    setRotateX(0);
    setRotateY(0);
  }

  return (
    <motion.div
      layoutId={`client-card-${client.id}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ perspective: 800 }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ rotateX, rotateY }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <Card
          className={`border-amber-200 bg-white/80 backdrop-blur transition-shadow ${
            isHighlighted
              ? "ring-2 ring-amber-400 shadow-lg shadow-amber-200/50"
              : ""
          }`}
        >
          <CardHeader>
            <CardTitle className="text-amber-900 font-bold text-lg flex items-center gap-2">
              <span className="text-xl">{statusEmoji[status]}</span>
              {client.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-amber-50 px-2 py-1.5">
                <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                  Přiděleno
                </p>
                <div className="text-lg font-bold text-amber-900">
                  <AnimatedNumber value={client.allocated} />
                </div>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-1.5">
                <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                  Maximum
                </p>
                <div className="text-lg font-bold text-amber-900">
                  <AnimatedNumber value={client.max} />
                </div>
              </div>
              <div className="rounded-lg bg-orange-50 px-2 py-1.5">
                <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wide">
                  Potřebuje
                </p>
                <div className="text-lg font-bold text-orange-700">
                  <AnimatedNumber value={client.need} />
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-amber-600">Průběh</span>
                <span className="text-xs font-semibold text-amber-800">
                  {Math.round(percentage)}%
                </span>
              </div>
              <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
