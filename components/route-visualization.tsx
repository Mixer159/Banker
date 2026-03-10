"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { type Route } from "@/lib/banker"
import { AnimatedNumber } from "@/components/animated-number"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type AnimPhase = "highlight" | "lend" | "return" | "pause"

const PHASE_DURATION: Record<AnimPhase, number> = {
  highlight: 800,
  lend: 1000,
  return: 1000,
  pause: 600,
}

const PHASE_ORDER: AnimPhase[] = ["highlight", "lend", "return", "pause"]

function fmt(n: number) {
  return n.toLocaleString("cs-CZ")
}

type ClientStatus = "waiting" | "active" | "done"

export function RouteVisualization({
  route,
  onReset,
}: {
  route: Route
  onReset: () => void
}) {
  const [currentRound, setCurrentRound] = React.useState(0)
  const [currentPhaseIdx, setCurrentPhaseIdx] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  const [started, setStarted] = React.useState(false)
  const [complete, setComplete] = React.useState(false)

  const currentPhase = PHASE_ORDER[currentPhaseIdx] as AnimPhase
  const round = route.rounds[currentRound]

  // Track which clients are done (served in previous rounds)
  const doneClients = React.useMemo(() => {
    const done = new Set<number>()
    for (let r = 0; r < currentRound; r++) {
      for (const c of route.rounds[r].clients) done.add(c)
    }
    // Also mark as done after return phase of current round
    if (
      currentPhase === "pause" ||
      (complete && currentRound === route.rounds.length - 1)
    ) {
      for (const c of round.clients) done.add(c)
    }
    return done
  }, [currentRound, currentPhase, complete, route, round])

  // Active clients in current round
  const activeClients = new Set(round?.clients ?? [])

  // Get client status
  function getClientStatus(clientIdx: number): ClientStatus {
    if (doneClients.has(clientIdx)) return "done"
    if (started && activeClients.has(clientIdx) && currentPhase !== "pause")
      return "active"
    return "waiting"
  }

  // Compute displayed available resources based on phase
  // In this algorithm, clients return all money after each round,
  // so availableBefore === totalResources for every round.
  const displayedAvailable = React.useMemo(() => {
    if (!started || complete) {
      return route.totalResources
    }
    if (currentPhase === "highlight") return round.availableBefore
    if (currentPhase === "lend") return round.availableAfter
    if (currentPhase === "return") return round.availableBefore
    // pause
    return round.availableBefore
  }, [started, complete, currentPhase, round, route.totalResources])

  const advancePhase = React.useCallback(() => {
    const nextPhaseIdx = currentPhaseIdx + 1
    if (nextPhaseIdx < PHASE_ORDER.length) {
      setCurrentPhaseIdx(nextPhaseIdx)
    } else {
      // Move to next round
      const nextRound = currentRound + 1
      if (nextRound < route.rounds.length) {
        setCurrentRound(nextRound)
        setCurrentPhaseIdx(0)
      } else {
        setComplete(true)
        setPlaying(false)
      }
    }
  }, [currentPhaseIdx, currentRound, route.rounds.length])

  // Auto-advance when playing
  React.useEffect(() => {
    if (!playing || !started || complete) return

    const timer = setTimeout(() => {
      advancePhase()
    }, PHASE_DURATION[currentPhase])

    return () => clearTimeout(timer)
  }, [playing, started, complete, currentPhase, advancePhase])

  function handlePlayPause() {
    if (!started) {
      setStarted(true)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }

  function handleStep() {
    if (!started) {
      setStarted(true)
      return
    }
    if (!complete) {
      advancePhase()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Bankéřův algoritmus</h1>
          <p className="text-sm text-muted-foreground">
            Dostupné prostředky:{" "}
            <AnimatedNumber
              value={displayedAvailable}
              suffix=" Kč"
              className="font-medium text-foreground"
            />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            disabled={complete}
          >
            {!started ? "Spustit" : playing ? "Pauza" : "Pokračovat"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStep}
            disabled={complete}
          >
            Krok →
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            Zpět
          </Button>
        </div>
      </div>

      {/* Round indicator */}
      {started && (
        <div className="flex items-center gap-2">
          {route.rounds.map((_, i) => (
            <Badge
              key={i}
              variant={
                i < currentRound || complete
                  ? "default"
                  : i === currentRound
                    ? "secondary"
                    : "outline"
              }
            >
              Kolo {i + 1}
            </Badge>
          ))}
        </div>
      )}

      {/* Client cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {route.needs.map((need, i) => {
          const status = getClientStatus(i)
          const isActiveInPhase = started && activeClients.has(i)
          const showAmount =
            isActiveInPhase &&
            (currentPhase === "lend" || currentPhase === "return")

          return (
            <div key={i} className="p-1">
              <motion.div
                className="h-full transform-gpu will-change-transform"
                animate={{
                  scale: status === "active" ? 1.04 : 1,
                  opacity:
                    started &&
                    status === "waiting" &&
                    currentPhase !== "pause"
                      ? 0.5
                      : 1,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Card
                  size="sm"
                  className={cn(
                    "h-full transition-colors duration-300",
                    status === "active" && "ring-2 ring-primary",
                    status === "done" && "bg-primary/5 ring-1 ring-primary/30",
                  )}
                >
                  <CardContent className="flex flex-col items-center gap-1 py-3 text-center">
                    <span className="text-xs font-medium text-muted-foreground">
                      K{i + 1}
                    </span>
                    <span className="text-sm font-medium">{fmt(need)} Kč</span>
                    {status === "done" && (
                      <span className="text-xs text-primary">✓</span>
                    )}
                    <div className="flex h-4 items-center justify-center overflow-hidden">
                      <AnimatePresence initial={false} mode="wait">
                        {showAmount && currentPhase === "lend" && (
                          <motion.span
                            key="lend"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="block text-xs font-medium text-destructive"
                          >
                            −{fmt(need)} Kč
                          </motion.span>
                        )}
                        {showAmount && currentPhase === "return" && (
                          <motion.span
                            key="return"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.16, ease: "easeOut" }}
                            className="block text-xs font-medium text-primary"
                          >
                            +{fmt(need)} Kč
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Current phase description */}
      {started && !complete && (
        <motion.div
          key={`${currentRound}-${currentPhase}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border px-4 py-3 text-sm"
        >
          {currentPhase === "highlight" && (
            <>
              <span className="font-medium">Kolo {currentRound + 1}:</span>{" "}
              Vybíráme klienty{" "}
              {round.clients.map((c) => `K${c + 1}`).join(", ")}.
              Potřebují celkem {fmt(round.totalLent)} Kč.
            </>
          )}
          {currentPhase === "lend" && (
            <>
              Půjčujeme {fmt(round.totalLent)} Kč. Zbývá{" "}
              {fmt(round.availableAfter)} Kč v trezoru.
            </>
          )}
          {currentPhase === "return" && (
            <>
              Klienti vrací peníze. Trezor se vrací na{" "}
              {fmt(round.availableBefore)} Kč.
            </>
          )}
          {currentPhase === "pause" && (
            <>Kolo {currentRound + 1} dokončeno.</>
          )}
        </motion.div>
      )}

      {/* Completion summary */}
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
        >
          Všichni klienti obslouženi v{" "}
          <span className="font-medium">
            {route.rounds.length}{" "}
            {route.rounds.length === 1 ? "kole" : "kolech"}
          </span>
          . Posloupnost:{" "}
          <span className="font-medium">
            {route.rounds
              .map(
                (r, ri) =>
                  `Kolo ${ri + 1}: ${r.clients.map((c) => `K${c + 1}`).join(", ")}`,
              )
              .join(" → ")}
          </span>
        </motion.div>
      )}

      {/* Results table after animation completes */}
      {complete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Přehled kol</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {route.rounds.map((round, ri) => (
                <div key={ri} className="rounded-md border px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Kolo {ri + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      Dostupné: {fmt(round.availableBefore)} Kč →{" "}
                      {fmt(round.availableAfter)} Kč
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Klient</TableHead>
                        <TableHead className="text-right">Půjčeno</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {round.clients.map((clientIdx, j) => (
                        <TableRow key={clientIdx}>
                          <TableCell className="font-medium">
                            K{clientIdx + 1}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(round.amounts[j])} Kč
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground">
                          Celkem v kole
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {fmt(round.totalLent)} Kč
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
