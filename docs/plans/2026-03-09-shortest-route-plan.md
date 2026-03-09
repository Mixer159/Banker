# Shortest Borrowing Route Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual simulation with automatic shortest-route computation and animated visualization.

**Architecture:** Add `findShortestRoute()` to banker.ts that brute-forces optimal client groupings per round (max 2^4 subsets). Replace simulation/safety-check phases with a single "route" phase rendered by a new `RouteVisualization` component. Remove all manual request infrastructure.

**Tech Stack:** Next.js, React 19, Motion (framer-motion), TypeScript, Vitest, Tailwind CSS v4

---

### Task 1: Add `findShortestRoute()` algorithm with tests

**Files:**
- Modify: `src/lib/banker.ts`
- Modify: `src/lib/banker.test.ts`

**Step 1: Add types and function to banker.ts**

Add after the existing `RequestResult` interface (line 29):

```typescript
export interface RouteStep {
  stepNumber: number;
  clientIds: number[];
  clientNames: string[];
  totalLent: number;
  availableBefore: number;
  availableAfter: number; // same as availableBefore since money returns
}

export interface RouteResult {
  possible: boolean;
  steps: RouteStep[];
  totalSteps: number;
}

/**
 * Najde nejkratší cestu půjčení — minimální počet kol pro obsloužení všech klientů.
 * V každém kole bankéř půjčí skupině klientů, ti vrátí peníze, a pokračuje se dalším kolem.
 */
export function findShortestRoute(
  totalResources: number,
  clients: Client[]
): RouteResult {
  // Check if any single client needs more than total
  for (const c of clients) {
    if (c.need > totalResources) {
      return { possible: false, steps: [], totalSteps: 0 };
    }
  }

  const remaining = new Set(clients.map((_, i) => i));
  const steps: RouteStep[] = [];
  let stepNumber = 1;

  while (remaining.size > 0) {
    // Find the largest subset that fits within totalResources
    const indices = Array.from(remaining);
    let bestSubset: number[] = [];

    // Brute-force all subsets (max 2^4 = 16)
    for (let mask = 1; mask < (1 << indices.length); mask++) {
      const subset: number[] = [];
      let total = 0;
      for (let bit = 0; bit < indices.length; bit++) {
        if (mask & (1 << bit)) {
          subset.push(indices[bit]);
          total += clients[indices[bit]].need;
        }
      }
      if (total <= totalResources && subset.length > bestSubset.length) {
        bestSubset = subset;
      }
    }

    if (bestSubset.length === 0) {
      return { possible: false, steps: [], totalSteps: 0 };
    }

    const totalLent = bestSubset.reduce((sum, i) => sum + clients[i].need, 0);
    steps.push({
      stepNumber,
      clientIds: bestSubset.map((i) => clients[i].id),
      clientNames: bestSubset.map((i) => clients[i].name),
      totalLent,
      availableBefore: totalResources,
      availableAfter: totalResources, // money returns after each round
    });

    for (const i of bestSubset) {
      remaining.delete(i);
    }
    stepNumber++;
  }

  return { possible: true, steps, totalSteps: steps.length };
}
```

**Step 2: Add tests for findShortestRoute**

Add to `banker.test.ts`:

```typescript
import { findShortestRoute } from "./banker";

describe("findShortestRoute", () => {
  it("finds 2-step route for classic example", () => {
    const clients = [
      createClient(0, 5_000_000, 0),
      createClient(1, 5_000_000, 0),
      createClient(2, 10_000_000, 0),
      createClient(3, 9_000_000, 0),
    ];
    const result = findShortestRoute(20_000_000, clients);
    expect(result.possible).toBe(true);
    expect(result.totalSteps).toBe(2);
    // Step 1 should serve 3 clients (K1+K2+K4 = 19M ≤ 20M)
    expect(result.steps[0].clientIds).toHaveLength(3);
    // Step 2 should serve remaining client (K3)
    expect(result.steps[1].clientIds).toHaveLength(1);
  });

  it("returns impossible when a client needs more than total", () => {
    const clients = [createClient(0, 25_000_000, 0)];
    const result = findShortestRoute(20_000_000, clients);
    expect(result.possible).toBe(false);
  });

  it("serves all clients in 1 step when they all fit", () => {
    const clients = [
      createClient(0, 5_000_000, 0),
      createClient(1, 5_000_000, 0),
      createClient(2, 5_000_000, 0),
    ];
    const result = findShortestRoute(20_000_000, clients);
    expect(result.possible).toBe(true);
    expect(result.totalSteps).toBe(1);
    expect(result.steps[0].clientIds).toHaveLength(3);
  });

  it("handles single client", () => {
    const clients = [createClient(0, 10_000_000, 0)];
    const result = findShortestRoute(10_000_000, clients);
    expect(result.possible).toBe(true);
    expect(result.totalSteps).toBe(1);
  });
});
```

**Step 3: Run tests**

Run: `cd "/Users/maximkudela/Documents/HTML Pages/Banker" && pnpm vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/lib/banker.ts src/lib/banker.test.ts
git commit -m "feat: add findShortestRoute algorithm with tests"
```

---

### Task 2: Simplify state management for route phase

**Files:**
- Modify: `src/hooks/useBankerState.ts`

**Step 1: Replace simulation/safety-check with route phase**

Rewrite `useBankerState.ts`:

- Change `Phase` type to `"setup" | "route"`
- Remove `HistoryEntry` interface
- Remove `safetyResult`, `history`, `pendingRequest` from `BankerState`
- Add `routeResult: RouteResult | null` to `BankerState`
- Remove actions: `SUBMIT_REQUEST`, `COMPLETE_SAFETY_CHECK`
- Rename `START_SIMULATION` to `START_ROUTE` — compute `findShortestRoute()` here
- Remove `submitRequest`, `completeSafetyCheck` from returned callbacks
- Simplify `addClient` to always use `allocated: 0`
- Remove `allocated` from `UPDATE_CLIENT` action
- Remove `updateClient` callback (no longer needed — only max matters)

The `START_ROUTE` reducer case:
```typescript
case "START_ROUTE": {
  const validation = validateSetup(state.totalResources, state.clients);
  if (!validation.valid) {
    return { ...state, error: validation.error ?? "Neplatný vstup." };
  }
  const routeResult = findShortestRoute(state.totalResources, state.clients);
  if (!routeResult.possible) {
    return { ...state, error: "Nelze najít cestu — některý klient potřebuje více než celkové prostředky." };
  }
  return { ...state, phase: "route", error: null, routeResult };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useBankerState.ts
git commit -m "refactor: simplify state for route phase, remove simulation"
```

---

### Task 3: Update SetupPhase to remove allocated input

**Files:**
- Modify: `src/components/SetupPhase.tsx`
- Modify: `src/components/ClientCardSetup.tsx`

**Step 1: Simplify SetupPhase props**

- Remove `onUpdateClient` prop (no longer needed)
- Change `onAddClient` call to just `onAddClient(0, 0)` (already correct)
- Remove `available` prop display from the setup (it's always equal to totalResources since allocated=0)
- Change button text from "Spustit simulaci" to "Najít nejkratší cestu"

**Step 2: ClientCardSetup already only has max input** — no changes needed (confirmed from reading the file).

**Step 3: Commit**

```bash
git add src/components/SetupPhase.tsx
git commit -m "refactor: simplify SetupPhase for route-only flow"
```

---

### Task 4: Create RouteVisualization component

**Files:**
- Create: `src/components/RouteVisualization.tsx`

**Step 1: Build the animated walkthrough component**

This is the core new UI. It should:
- Accept `routeResult`, `clients`, `totalResources`, and `onReset` as props
- Use state to track: `currentStep` (which round is animating), `animationPhase` within each step (highlight → lend → return → done), `isPlaying`
- Auto-advance through animation phases with timers
- Show:
  - Header with "Nejkratší cesta půjčení" title and reset button
  - VaultDisplay showing current available money (animates down when lending, back up when returning)
  - Client cards grid — each card shows status: pending/active/done
  - Step indicator: "Krok X z Y"
  - Step detail: which clients are being served this round, how much
  - Final summary: "Hotovo v X krocích!" with step breakdown

Animation phases per step:
1. `"highlight"` (800ms) — active client cards glow amber
2. `"lend"` (1000ms) — vault animates down by totalLent, money flows to clients
3. `"return"` (800ms) — vault animates back up, clients marked done
4. `"pause"` (400ms) — brief pause before next step

After all steps: `"complete"` — show summary with confetti

**Step 2: Commit**

```bash
git add src/components/RouteVisualization.tsx
git commit -m "feat: add RouteVisualization animated walkthrough component"
```

---

### Task 5: Wire everything together in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace SimulationPhase and SafetyCheckOverlay with RouteVisualization**

- Remove imports: `SimulationPhase`, `SafetyCheckOverlay`
- Add import: `RouteVisualization`
- Remove destructured callbacks: `submitRequest`, `completeSafetyCheck`
- Rename `startSimulation` → `startRoute` in destructuring
- Replace the simulation/safety-check render block with:

```tsx
{state.phase === "route" && state.routeResult && (
  <RouteVisualization
    key="route"
    routeResult={state.routeResult}
    clients={state.clients}
    totalResources={state.totalResources}
    onReset={reset}
  />
)}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire RouteVisualization into main page"
```

---

### Task 6: Remove unused components

**Files:**
- Delete: `src/components/SimulationPhase.tsx`
- Delete: `src/components/SafetyCheckOverlay.tsx`
- Delete: `src/components/RequestForm.tsx`
- Delete: `src/components/HistoryLog.tsx`

**Step 1: Delete the files**

```bash
rm src/components/SimulationPhase.tsx
rm src/components/SafetyCheckOverlay.tsx
rm src/components/RequestForm.tsx
rm src/components/HistoryLog.tsx
```

**Step 2: Verify build passes**

Run: `cd "/Users/maximkudela/Documents/HTML Pages/Banker" && pnpm build`
Expected: Build succeeds with no import errors

**Step 3: Commit**

```bash
git add -u
git commit -m "chore: remove unused simulation components"
```

---

### Task 7: Manual verification

**Step 1: Run dev server and test**

Run: `pnpm dev`

Test scenarios:
1. Set total to 20,000,000
2. Add 4 clients: K1=5M, K2=5M, K3=10M, K4=9M
3. Click "Najít nejkratší cestu"
4. Verify animated walkthrough shows 2 steps
5. Verify Step 1 serves K1+K2+K4, Step 2 serves K3
6. Verify vault animation works correctly
7. Test reset button returns to setup
8. Test edge case: all clients fit in 1 step
9. Test edge case: client needs more than total (should show error)

**Step 2: Run all tests**

Run: `pnpm vitest run`
Expected: All tests pass
