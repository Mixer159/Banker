# Dynamic Clients & Animated Route Visualization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dynamic 2-8 client support with +/- buttons and a step-by-step animated route visualization with play/pause controls.

**Architecture:** Single-page app with two phases (setup → result). Setup uses dynamic array state for clients. Result phase renders a `RouteVisualization` component that drives a per-round animation state machine (highlight → lend → return → pause) using Framer Motion.

**Tech Stack:** Next.js 16, React 19, Framer Motion (motion/react), Tailwind CSS v4, shadcn/ui components, TypeScript

---

### Task 1: Add Framer Motion dependency

**Files:**
- Modify: `package.json`

**Step 1: Install motion**

Run: `pnpm add motion`

**Step 2: Verify installation**

Run: `pnpm exec next build 2>&1 | head -5` or just `pnpm dev` to confirm no errors.

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add motion (framer motion) dependency"
```

---

### Task 2: Create AnimatedNumber component

**Files:**
- Create: `components/animated-number.tsx`

**Step 1: Write the component**

```tsx
"use client"

import * as React from "react"
import { useSpring, useTransform, motion, type SpringOptions } from "motion/react"

const spring: SpringOptions = { stiffness: 200, damping: 30 }

export function AnimatedNumber({
  value,
  suffix = "",
  className,
}: {
  value: number
  suffix?: string
  className?: string
}) {
  const motionValue = useSpring(value, spring)
  const display = useTransform(motionValue, (v) =>
    Math.round(v).toLocaleString("cs-CZ"),
  )

  React.useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return (
    <span className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}
```

**Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`

**Step 3: Commit**

```bash
git add components/animated-number.tsx
git commit -m "feat: add AnimatedNumber component with spring animation"
```

---

### Task 3: Update page.tsx — dynamic client count

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace hardcoded NUM_CLIENTS with dynamic state**

Replace the constant and state initialization:

```tsx
const MIN_CLIENTS = 2
const MAX_CLIENTS = 8

// Inside Page component, replace:
//   const [clientNeeds, setClientNeeds] = React.useState(
//     Array.from({ length: NUM_CLIENTS }, () => ""),
//   )
// With:
const [clientNeeds, setClientNeeds] = React.useState(
  Array.from({ length: MIN_CLIENTS }, () => ""),
)
```

**Step 2: Add add/remove client handlers**

```tsx
function addClient() {
  if (clientNeeds.length >= MAX_CLIENTS) return
  setClientNeeds((prev) => [...prev, ""])
}

function removeClient() {
  if (clientNeeds.length <= MIN_CLIENTS) return
  setClientNeeds((prev) => prev.slice(0, -1))
}
```

**Step 3: Update the setup UI with +/- buttons and AnimatePresence**

Replace the static "Zadejte... 4 klientů" text and client grid with:

```tsx
import { AnimatePresence, motion } from "motion/react"

// In the subtitle:
<p className="text-sm text-muted-foreground">
  Zadejte celkové prostředky a požadavky klientů.
</p>

// Client header with +/- buttons:
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

// Animated grid:
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
```

**Step 4: Remove the `NUM_CLIENTS` constant**

Delete: `const NUM_CLIENTS = 4`

**Step 5: Verify**

Run: `pnpm dev` — test adding/removing clients in the browser. Verify cards animate in/out.

**Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: dynamic 2-8 client count with +/- buttons and animations"
```

---

### Task 4: Create RouteVisualization component

This is the main animated walkthrough component. It receives a `Route` and drives a state machine through the animation phases.

**Files:**
- Create: `components/route-visualization.tsx`

**Step 1: Write the component**

```tsx
"use client"

import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { type Route } from "@/lib/banker"
import { AnimatedNumber } from "@/components/animated-number"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
    if (currentPhase === "pause" || (complete && currentRound === route.rounds.length - 1)) {
      for (const c of round.clients) done.add(c)
    }
    return done
  }, [currentRound, currentPhase, complete, route, round])

  // Active clients in current round
  const activeClients = new Set(round?.clients ?? [])

  // Get client status
  function getClientStatus(clientIdx: number): ClientStatus {
    if (doneClients.has(clientIdx)) return "done"
    if (started && activeClients.has(clientIdx) && currentPhase !== "pause") return "active"
    return "waiting"
  }

  // Compute displayed available resources based on phase
  const displayedAvailable = React.useMemo(() => {
    if (!started || complete) {
      return complete
        ? route.totalResources
        : route.totalResources
    }
    if (currentPhase === "highlight") return round.availableBefore
    if (currentPhase === "lend") return round.availableAfter
    if (currentPhase === "return") return round.availableBefore
    // pause
    return round.availableBefore
  }, [started, complete, currentPhase, round, route.totalResources])

  // Auto-advance when playing
  React.useEffect(() => {
    if (!playing || !started || complete) return

    const timer = setTimeout(() => {
      advancePhase()
    }, PHASE_DURATION[currentPhase])

    return () => clearTimeout(timer)
  }, [playing, started, complete, currentRound, currentPhaseIdx])

  function advancePhase() {
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
  }

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
            isActiveInPhase && (currentPhase === "lend" || currentPhase === "return")

          return (
            <motion.div
              key={i}
              animate={{
                scale: status === "active" ? 1.05 : 1,
                opacity: started && status === "waiting" && currentPhase !== "pause" ? 0.5 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card
                size="sm"
                className={cn(
                  "transition-colors duration-500",
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
                  <AnimatePresence>
                    {showAmount && currentPhase === "lend" && (
                      <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs font-medium text-destructive"
                      >
                        −{fmt(need)} Kč
                      </motion.span>
                    )}
                    {showAmount && currentPhase === "return" && (
                      <motion.span
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs font-medium text-primary"
                      >
                        +{fmt(need)} Kč
                      </motion.span>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
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
            {route.rounds.length === 1
              ? "kole"
              : route.rounds.length < 5
                ? "kolech"
                : "kolech"}
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
    </div>
  )
}
```

**Step 2: Verify compilation**

Run: `pnpm exec tsc --noEmit`

**Step 3: Commit**

```bash
git add components/route-visualization.tsx
git commit -m "feat: add RouteVisualization with animated step-by-step walkthrough"
```

---

### Task 5: Wire RouteVisualization into page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace the static result phase with RouteVisualization**

Replace the entire result phase return block (the `if (phase === "result")` section starting at `return <div className="mx-auto flex min-h-svh max-w-3xl...`) with:

```tsx
import { RouteVisualization } from "@/components/route-visualization"

// Result phase:
return (
  <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
    <RouteVisualization route={route!} onReset={handleReset} />
  </div>
)
```

**Step 2: Clean up unused imports**

Remove imports that are no longer used in the result phase: `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` (if only used in result phase — check if setup phase uses them too). Keep `Badge` only if still used.

**Step 3: Verify**

Run: `pnpm dev` — test full flow: set up clients with various counts (2-8), compute route, watch animated walkthrough. Test play/pause and step buttons.

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire RouteVisualization into result phase, remove static tables"
```

---

### Task 6: Final verification and cleanup

**Files:**
- Possibly: `app/page.tsx`, `components/route-visualization.tsx`

**Step 1: Run typecheck**

Run: `pnpm exec tsc --noEmit`

**Step 2: Run build**

Run: `pnpm build`

**Step 3: Manual testing checklist**

- [ ] Add clients from 2 to 8, verify +/- buttons disable at bounds
- [ ] Remove clients back to 2
- [ ] Enter values and compute route
- [ ] Watch animation play through all rounds
- [ ] Test pause/resume
- [ ] Test step button
- [ ] Test reset button
- [ ] Test dark mode (press 'd')
- [ ] Test with different client counts (2, 4, 8)

**Step 4: Fix any issues found**

**Step 5: Commit**

```bash
git add -A
git commit -m "fix: address issues from final review"
```
