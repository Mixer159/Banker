"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RotateCcw, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultDisplay } from "./VaultDisplay";
import type { RouteResult, Client } from "@/lib/banker";

interface RouteVisualizationProps {
  routeResult: RouteResult;
  clients: Client[];
  totalResources: number;
  onReset: () => void;
}

type AnimationPhase =
  | "idle"
  | "highlight"
  | "lend"
  | "return"
  | "done"
  | "complete";

const CONFETTI_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7"];

const PHASE_TIMINGS: Record<string, number> = {
  idle: 600,
  highlight: 800,
  lend: 1200,
  return: 1000,
  done: 600,
};

export function RouteVisualization({
  routeResult,
  clients,
  totalResources,
  onReset,
}: RouteVisualizationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [completedClientIds, setCompletedClientIds] = useState<Set<number>>(
    new Set()
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [displayedAvailable, setDisplayedAvailable] = useState(totalResources);

  const { steps, totalSteps } = routeResult;
  const currentStep = steps[currentStepIndex] ?? null;

  // Derive which client IDs are active in the current step
  const activeClientIds = new Set(currentStep?.clientIds ?? []);

  // Advance the animation state machine
  const advancePhase = useCallback(() => {
    setAnimationPhase((prev) => {
      switch (prev) {
        case "idle":
          return "highlight";
        case "highlight":
          return "lend";
        case "lend":
          return "return";
        case "return":
          return "done";
        case "done": {
          // Mark current step's clients as completed
          setCompletedClientIds((prevSet) => {
            const next = new Set(prevSet);
            for (const id of steps[currentStepIndex]?.clientIds ?? []) {
              next.add(id);
            }
            return next;
          });

          // Move to next step or complete
          if (currentStepIndex + 1 >= totalSteps) {
            return "complete";
          }
          setCurrentStepIndex((i) => i + 1);
          return "highlight";
        }
        default:
          return prev;
      }
    });
  }, [currentStepIndex, totalSteps, steps]);

  // Handle vault display value based on phase
  useEffect(() => {
    if (animationPhase === "lend" && currentStep) {
      setDisplayedAvailable(totalResources - currentStep.totalLent);
    } else if (animationPhase === "return" || animationPhase === "done") {
      setDisplayedAvailable(totalResources);
    }
  }, [animationPhase, currentStep, totalResources]);

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying) return;
    if (animationPhase === "complete") return;

    const timing = PHASE_TIMINGS[animationPhase] ?? 600;
    const timer = setTimeout(() => {
      advancePhase();
    }, timing);

    return () => clearTimeout(timer);
  }, [animationPhase, isPlaying, advancePhase]);

  // Pluralize Czech "krok"
  const krokText = (n: number) => {
    if (n === 1) return "kroku";
    return "krocích";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold text-amber-900 sm:text-4xl">
            <span className="mr-2">{"\u{1F3E6}"}</span>Nejkratší cesta půjčení
          </h1>
          <p className="text-sm text-amber-600 mt-1">
            Bankéřův algoritmus — optimální pořadí
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying((p) => !p)}
            className="text-amber-700 hover:bg-amber-50"
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>
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

      {/* Vault + Step Indicator row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Vault */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <VaultDisplay available={displayedAvailable} total={totalResources} />
        </motion.div>

        {/* Step indicator & money flow animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <AnimatePresence mode="wait">
            {animationPhase !== "complete" ? (
              <motion.div
                key={`step-${currentStepIndex}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-xl bg-amber-100 border-2 border-amber-300 px-6 py-4 text-center"
              >
                <p className="text-sm font-medium text-amber-600 mb-1">
                  Aktuální krok
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {currentStepIndex + 1}{" "}
                  <span className="text-lg font-normal text-amber-600">
                    z {totalSteps}
                  </span>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="complete-badge"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="rounded-xl bg-green-100 border-2 border-green-300 px-6 py-4 text-center"
              >
                <p className="text-3xl font-bold text-green-800">
                  Hotovo!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phase label */}
          <AnimatePresence mode="wait">
            {animationPhase !== "complete" && (
              <motion.p
                key={`phase-${animationPhase}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm font-medium text-amber-700"
              >
                {animationPhase === "idle" && "Příprava..."}
                {animationPhase === "highlight" && "Výběr klientů"}
                {animationPhase === "lend" &&
                  `Půjčování ${currentStep?.totalLent.toLocaleString("cs-CZ")} Kč`}
                {animationPhase === "return" && "Klienti vrací prostředky"}
                {animationPhase === "done" && "Kolo dokončeno"}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Money flow particles during lend/return */}
          <div className="relative h-8 w-full">
            <AnimatePresence>
              {animationPhase === "lend" &&
                Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`lend-coin-${currentStepIndex}-${i}`}
                    className="absolute left-1/2 top-1/2 size-3 rounded-full bg-amber-500"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                    animate={{
                      x: (i - 2.5) * 40,
                      y: 10,
                      opacity: [1, 1, 0],
                      scale: [0, 1, 0.5],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeOut",
                    }}
                  />
                ))}
              {animationPhase === "return" &&
                Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`return-coin-${currentStepIndex}-${i}`}
                    className="absolute left-1/2 top-1/2 size-3 rounded-full bg-green-500"
                    initial={{
                      x: (i - 2.5) * 40,
                      y: 10,
                      opacity: 1,
                      scale: 0.5,
                    }}
                    animate={{
                      x: 0,
                      y: 0,
                      opacity: [1, 1, 0],
                      scale: [0.5, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.8,
                      delay: i * 0.1,
                      ease: "easeIn",
                    }}
                  />
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Client cards grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold text-amber-900 mb-4">Klienti</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {clients.map((client) => {
            const isActive =
              activeClientIds.has(client.id) &&
              animationPhase !== "idle" &&
              animationPhase !== "complete";
            const isDone = completedClientIds.has(client.id);

            let emoji = "\u{1F9D1}"; // default person
            let borderClass = "border-gray-200 bg-gray-50";
            let statusText = "";

            if (isDone) {
              emoji = "\u2705";
              borderClass = "border-green-300 bg-green-50";
              statusText = "Dokončen \u2713";
            } else if (isActive) {
              emoji =
                animationPhase === "lend"
                  ? "\u{1F4B0}" // money bag during lending
                  : animationPhase === "return"
                    ? "\u{1F4B8}" // money with wings during return
                    : "\u{1F50D}"; // magnifying glass during highlight
              borderClass =
                "border-amber-400 bg-amber-50 shadow-lg shadow-amber-200/50";
            }

            return (
              <motion.div
                key={client.id}
                layout
                className={`relative rounded-2xl border-2 p-4 text-center transition-colors ${borderClass}`}
                animate={
                  isActive
                    ? {
                        boxShadow: [
                          "0 0 0px rgba(245,158,11,0)",
                          "0 0 24px rgba(245,158,11,0.5)",
                          "0 0 0px rgba(245,158,11,0)",
                        ],
                      }
                    : {}
                }
                transition={
                  isActive
                    ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              >
                {/* Scanning beam for active cards */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                  </motion.div>
                )}

                <motion.span
                  className="text-3xl block"
                  animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                  transition={
                    isActive
                      ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                      : {}
                  }
                >
                  {emoji}
                </motion.span>
                <p className="text-sm font-bold text-gray-900 mt-2">
                  {client.name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {client.need.toLocaleString("cs-CZ")} Kč
                </p>

                {isDone && (
                  <motion.p
                    className="text-xs font-semibold text-green-700 mt-1"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {statusText}
                  </motion.p>
                )}

                {isActive && animationPhase === "lend" && (
                  <motion.p
                    className="text-xs font-semibold text-amber-700 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Půjčuje se...
                  </motion.p>
                )}

                {isActive && animationPhase === "return" && (
                  <motion.p
                    className="text-xs font-semibold text-green-700 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Vrací prostředky
                  </motion.p>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Step timeline / log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold text-amber-900 mb-4">
          Průběh kroků
        </h2>
        <div className="rounded-2xl border border-amber-200 bg-white/70 backdrop-blur overflow-hidden">
          {steps.map((step, index) => {
            const isPast = index < currentStepIndex;
            const isCurrent =
              index === currentStepIndex && animationPhase !== "complete";
            const isFuture = index > currentStepIndex;
            // In "complete" phase, all steps are past
            const isAllDone = animationPhase === "complete";

            return (
              <motion.div
                key={step.stepNumber}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`flex items-center gap-3 px-4 py-3 border-b border-amber-100 last:border-b-0 transition-colors ${
                  isCurrent
                    ? "bg-amber-100/80"
                    : isPast || isAllDone
                      ? "bg-green-50/50"
                      : "bg-white/50 opacity-50"
                }`}
              >
                {/* Step number circle */}
                <div
                  className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCurrent
                      ? "bg-amber-500 text-white"
                      : isPast || isAllDone
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isPast || isAllDone ? "\u2713" : step.stepNumber}
                </div>

                {/* Step description */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent
                        ? "text-amber-900"
                        : isPast || isAllDone
                          ? "text-green-800"
                          : "text-gray-500"
                    }`}
                  >
                    <span className="font-bold">Krok {step.stepNumber}:</span>{" "}
                    {step.clientNames.join(" + ")}{" "}
                    <span className="text-xs">{"→"}</span>{" "}
                    {step.totalLent.toLocaleString("cs-CZ")} Kč
                  </p>
                </div>

                {/* Current step indicator */}
                {isCurrent && (
                  <motion.div
                    className="flex-shrink-0"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <span className="text-xs font-semibold text-amber-600 bg-amber-200 px-2 py-0.5 rounded-full">
                      probíhá
                    </span>
                  </motion.div>
                )}

                {isFuture && !isAllDone && (
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    čeká
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Complete state */}
      <AnimatePresence>
        {animationPhase === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-center overflow-hidden"
          >
            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i / 20) * 360;
                const rad = (angle * Math.PI) / 180;
                const distance = 150 + Math.random() * 100;
                const tx = Math.cos(rad) * distance;
                const ty = Math.sin(rad) * distance;
                const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                const size = 8 + Math.random() * 8;

                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: color,
                      left: "50%",
                      top: "50%",
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: 0,
                    }}
                    animate={{
                      x: tx,
                      y: ty,
                      opacity: 0,
                      scale: [0, 1.5, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: i * 0.03,
                      ease: "easeOut",
                    }}
                  />
                );
              })}
            </div>

            <motion.p
              className="text-3xl sm:text-4xl font-bold text-green-800 mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
                delay: 0.1,
              }}
            >
              Hotovo v {totalSteps} {krokText(totalSteps)}!{" "}
              <span>{"\u{1F389}"}</span>
            </motion.p>

            {/* Summary of all steps */}
            <div className="space-y-2 mt-4">
              {steps.map((step, i) => (
                <motion.p
                  key={step.stepNumber}
                  className="text-sm text-green-700 font-medium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                >
                  <span className="inline-flex items-center gap-1">
                    <span className="text-green-500">{"\u2713"}</span>
                    Krok {step.stepNumber}: {step.clientNames.join(" + ")} →{" "}
                    {step.totalLent.toLocaleString("cs-CZ")} Kč
                  </span>
                </motion.p>
              ))}
            </div>

            <motion.div
              className="mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={onReset}
                className="bg-amber-600 text-white hover:bg-amber-700 px-6"
                size="lg"
              >
                <RotateCcw className="size-4 mr-2" />
                Nová simulace
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
