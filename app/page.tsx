"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { type Route, findShortestRoute, validateSetup } from "@/lib/banker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const MIN_CLIENTS = 2
const MAX_CLIENTS = 8

function fmt(n: number) {
  return n.toLocaleString("cs-CZ")
}

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
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Bankéřův algoritmus</h1>
          <p className="text-sm text-muted-foreground">
            Celkové prostředky: {fmt(route!.totalResources)} Kč
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Zpět
        </Button>
      </div>

      {/* Route */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-sm">
            Nejkratší cesta
            <Badge variant="outline" className="font-mono text-xs">
              {route!.rounds.length} {route!.rounds.length === 1 ? "kolo" : route!.rounds.length < 5 ? "kola" : "kol"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {route!.rounds.map((round, ri) => (
            <div key={ri} className="rounded-md border px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Kolo {ri + 1}</span>
                <span className="text-xs text-muted-foreground">
                  Dostupné: {fmt(round.availableBefore)} Kč → {fmt(round.availableAfter)} Kč
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
                      <TableCell className="font-medium">K{clientIdx + 1}</TableCell>
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

      {/* Summary */}
      <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        Všichni klienti obslouženi v{" "}
        <span className="font-medium">
          {route!.rounds.length} {route!.rounds.length === 1 ? "kole" : route!.rounds.length < 5 ? "kolech" : "kolech"}
        </span>
        . Posloupnost:{" "}
        <span className="font-medium">
          {route!.rounds
            .map(
              (r, ri) =>
                `Kolo ${ri + 1}: ${r.clients.map((c) => `K${c + 1}`).join(", ")}`,
            )
            .join(" → ")}
        </span>
      </div>

      {/* Client overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Požadavky klientů</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead className="text-right">Požadavek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {route!.needs.map((need, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">K{i + 1}</TableCell>
                  <TableCell className="text-right font-mono">
                    {fmt(need)} Kč
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Celkem
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {fmt(route!.needs.reduce((a, b) => a + b, 0))} Kč
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
