"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, ShieldX, Coins, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "./AnimatedNumber";
import type { SafetyResult, Client } from "@/lib/banker";

interface SafetyCheckOverlayProps {
  safetyResult: SafetyResult;
  clients: Client[];
  available: number;
  pendingRequest: { clientIndex: number; amount: number } | null;
  onComplete: () => void;
}

const CONFETTI_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444"];

export function SafetyCheckOverlay({
  safetyResult,
  clients,
  available,
  pendingRequest,
  onComplete,
}: SafetyCheckOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [showResult, setShowResult] = useState(false);
  const [completedClients, setCompletedClients] = useState<Set<number>>(
    new Set()
  );
  const [animatedWork, setAnimatedWork] = useState(available);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = safetyResult.steps;
  const totalSteps = steps.length;

  // Advance to next step
  const advanceStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const next = prev + 1;
      if (next >= totalSteps) {
        return prev;
      }
      return next;
    });
  }, [totalSteps]);

  // Auto-advance through steps
  useEffect(() => {
    if (!isPlaying) return;

    // Intro phase
    if (currentStepIndex === -1) {
      const timer = setTimeout(() => {
        advanceStep();
      }, 1000);
      return () => clearTimeout(timer);
    }

    // All steps done - show result
    if (currentStepIndex >= totalSteps) {
      return;
    }

    const currentStep = steps[currentStepIndex];

    if (currentStep.canFinish) {
      // Step can finish: delay 400ms, update completed and work, then after 1200ms advance
      const updateTimer = setTimeout(() => {
        setCompletedClients((prev) => {
          const next = new Set(prev);
          next.add(currentStep.clientId);
          return next;
        });
        setAnimatedWork(currentStep.workAfter);
      }, 400);

      const advanceTimer = setTimeout(() => {
        if (currentStepIndex + 1 >= totalSteps) {
          // Show result after 600ms
          setTimeout(() => setShowResult(true), 600);
        } else {
          advanceStep();
        }
      }, 1200);

      return () => {
        clearTimeout(updateTimer);
        clearTimeout(advanceTimer);
      };
    } else {
      // Step cannot finish: advance after 1200ms
      const advanceTimer = setTimeout(() => {
        if (currentStepIndex + 1 >= totalSteps) {
          setTimeout(() => setShowResult(true), 600);
        } else {
          advanceStep();
        }
      }, 1200);

      return () => clearTimeout(advanceTimer);
    }
  }, [currentStepIndex, isPlaying, steps, totalSteps, advanceStep]);

  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < totalSteps
      ? steps[currentStepIndex]
      : null;

  const requestingClient = pendingRequest
    ? clients[pendingRequest.clientIndex]
    : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 overflow-hidden"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
            <Coins className="size-5 text-amber-600" />
            Bezpečnostní kontrola
          </h2>
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
        </div>

        {/* Request info */}
        {pendingRequest && requestingClient && (
          <motion.div
            className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{requestingClient.name}</span>{" "}
              {"\u017E\u00E1d\u00E1 o"}{" "}
              <span className="font-bold text-amber-900">
                {pendingRequest.amount}
              </span>{" "}
              {"prost\u0159edk\u016F"}
            </p>
          </motion.div>
        )}

        {/* Work counter */}
        <motion.div
          className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-sm font-medium text-amber-700">
            {"Dostupn\u00E9 prost\u0159edky (work)"}
          </span>
          <span className="text-2xl font-bold text-amber-900">
            <AnimatedNumber value={animatedWork} />
          </span>
        </motion.div>

        {/* Client grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {clients.map((client) => {
            const isChecking = currentStep?.clientId === client.id;
            const isDone = completedClients.has(client.id);
            let emoji = "\u{1F9D1}";
            if (isChecking) emoji = "\u{1F50D}";
            if (isDone) emoji = "\u2705";

            return (
              <motion.div
                key={client.id}
                className={`relative rounded-xl border-2 p-3 text-center transition-colors ${
                  isChecking
                    ? "border-amber-400 bg-amber-50 shadow-lg shadow-amber-200/50"
                    : isDone
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                }`}
                animate={
                  isChecking
                    ? {
                        boxShadow: [
                          "0 0 0px rgba(245,158,11,0)",
                          "0 0 20px rgba(245,158,11,0.4)",
                          "0 0 0px rgba(245,158,11,0)",
                        ],
                      }
                    : {}
                }
                transition={
                  isChecking
                    ? { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              >
                {/* Scanning beam effect */}
                {isChecking && (
                  <motion.div
                    className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
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

                <span className="text-2xl">{emoji}</span>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {client.name}
                </p>
                <p className="text-xs text-gray-600">
                  {"pot\u0159eba:"} {client.need}
                </p>
                {isDone && (
                  <motion.p
                    className="text-xs font-semibold text-green-700 mt-0.5"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {"Dokon\u010Den \u2713"}
                  </motion.p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Step description */}
        <AnimatePresence mode="wait">
          {currentStep && !showResult && (
            <motion.div
              key={currentStepIndex}
              className={`rounded-lg p-3 mb-4 ${
                currentStep.canFinish
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <p
                className={`text-sm font-medium ${
                  currentStep.canFinish ? "text-green-800" : "text-red-800"
                }`}
              >
                {currentStep.canFinish ? (
                  <>
                    <span className="font-bold">{currentStep.clientName}</span>
                    {": pot\u0159eba \u2264 work ("}{currentStep.workBefore}
                    {") \u2192"}{" "}
                    <span className="font-bold text-green-700">
                      {"m\u016F\u017Ee dokon\u010Dit!"}
                    </span>{" "}
                    {"Work: "}{currentStep.workBefore}{" \u2192 "}{currentStep.workAfter}
                  </>
                ) : (
                  <>
                    <span className="font-bold">{currentStep.clientName}</span>
                    {": pot\u0159eba > work ("}{currentStep.workBefore}
                    {") \u2192"}{" "}
                    <span className="font-bold text-red-700">
                      {"nem\u016F\u017Ee dokon\u010Dit, p\u0159esko\u010Deno"}
                    </span>
                  </>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Green flash for canFinish */}
        <AnimatePresence>
          {currentStep?.canFinish && !showResult && (
            <motion.div
              key={`green-flash-${currentStepIndex}`}
              className="absolute inset-0 rounded-2xl bg-green-400 pointer-events-none"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Red flash for !canFinish */}
        <AnimatePresence>
          {currentStep && !currentStep.canFinish && !showResult && (
            <motion.div
              key={`red-flash-${currentStepIndex}`}
              className="absolute inset-0 rounded-2xl bg-red-400 pointer-events-none"
              initial={{ opacity: 0.2 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="space-y-4"
            >
              {safetyResult.safe ? (
                <>
                  {/* Confetti effect */}
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

                  {/* Safe badge */}
                  <motion.div
                    className="flex items-center justify-center gap-2 text-green-700"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 15,
                      delay: 0.1,
                    }}
                  >
                    <ShieldCheck className="size-8" />
                    <span className="text-2xl font-bold">
                      {"BEZPE\u010CN\u00DD STAV"}
                    </span>
                  </motion.div>

                  {/* Sequence display */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {safetyResult.sequence.map((id, i) => (
                      <motion.span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-3 py-1 text-sm font-semibold text-green-800"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.15 }}
                      >
                        {i > 0 && (
                          <span className="text-green-400 mr-1">
                            {"\u2192"}
                          </span>
                        )}
                        K{id + 1}
                      </motion.span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Red flash overlay */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-red-500 pointer-events-none"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                  />

                  {/* Unsafe badge with shake */}
                  <motion.div
                    className="flex items-center justify-center gap-2 text-red-700"
                    animate={{
                      x: [0, -4, 4, -4, 4, -2, 2, 0],
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <ShieldX className="size-8" />
                    <span className="text-2xl font-bold">
                      {"NEBEZPE\u010CN\u00DD STAV"}
                    </span>
                  </motion.div>

                  {/* Rollback message */}
                  <motion.p
                    className="text-center text-sm text-red-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {"\u017D\u00E1dost zam\u00EDtnuta \u2014 zm\u011Bny byly vr\u00E1ceny zp\u011Bt."}
                  </motion.p>
                </>
              )}

              {/* Continue button */}
              <motion.div
                className="flex justify-center pt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={onComplete}
                  className="bg-amber-600 text-white hover:bg-amber-700 px-6"
                  size="lg"
                >
                  {"Pokra\u010Dovat"}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
