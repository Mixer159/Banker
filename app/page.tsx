"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { type Route, findShortestRoute, validateSetup } from "@/lib/banker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RouteVisualization } from "@/components/route-visualization"

const MIN_CLIENTS = 2
const MAX_CLIENTS = 8

function fmtInput(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  return parseInt(digits).toLocaleString("cs-CZ")
}

function parseInput(value: string) {
  return value.replace(/\D/g, "")
}

export default function Page() {
  const [phase, setPhase] = React.useState<"setup" | "result">("setup")

  // Setup
  const [totalResources, setTotalResources] = React.useState("")
  const [clientNeeds, setClientNeeds] = React.useState(
    Array.from({ length: MIN_CLIENTS }, () => ""),
  )
  const [setupError, setSetupError] = React.useState<string | null>(null)

  // Result
  const [route, setRoute] = React.useState<Route | null>(null)

  function handleStart() {
    const total = parseInt(parseInput(totalResources))
    const needs = clientNeeds.map((v) => parseInt(parseInput(v)))

    if (isNaN(total) || needs.some((n) => isNaN(n))) {
      setSetupError("Vyplňte všechna pole platnými čísly.")
      return
    }

    const error = validateSetup(total, needs)
    if (error) {
      setSetupError(error)
      return
    }

    const result = findShortestRoute(total, needs)
    setRoute(result)
    setSetupError(null)
    setPhase("result")
  }

  function handleReset() {
    setPhase("setup")
    setRoute(null)
  }

  function addClient() {
    if (clientNeeds.length >= MAX_CLIENTS) return
    setClientNeeds((prev) => [...prev, ""])
  }

  function removeClient() {
    if (clientNeeds.length <= MIN_CLIENTS) return
    setClientNeeds((prev) => prev.slice(0, -1))
  }

  if (phase === "setup") {
    return (
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-lg font-medium">Bankéřův algoritmus</h1>
          <p className="text-sm text-muted-foreground">
            Zadejte celkové prostředky a požadavky klientů.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Celkové prostředky bankéře</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="např. 20 000 000"
            value={fmtInput(totalResources)}
            onChange={(e) => setTotalResources(parseInput(e.target.value))}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Klienti ({clientNeeds.length})
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={removeClient}
              disabled={clientNeeds.length <= MIN_CLIENTS}
            >
              −
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={addClient}
              disabled={clientNeeds.length >= MAX_CLIENTS}
            >
              +
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence initial={false}>
            {clientNeeds.map((need, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Klient {i + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <label className="text-xs text-muted-foreground">Požadavek</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="částka"
                      value={fmtInput(need)}
                      onChange={(e) => {
                        const next = [...clientNeeds]
                        next[i] = parseInput(e.target.value)
                        setClientNeeds(next)
                      }}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {setupError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {setupError}
          </div>
        )}

        <Button onClick={handleStart} className="self-start">
          Najít nejkratší cestu
        </Button>
      </div>
    )
  }

  // Result phase
  if (!route) return null
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <RouteVisualization route={route} onReset={handleReset} />
    </div>
  )
}
