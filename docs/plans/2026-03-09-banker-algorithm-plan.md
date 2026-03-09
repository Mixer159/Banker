# Banker's Algorithm Interactive Visualizer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an animated Next.js web app that visualizes the Banker's Algorithm with a bank/vault theme, Czech UI, and rich step-by-step animations.

**Architecture:** Single-page state machine (`setup → simulation → safety-check overlay → simulation`) using React `useReducer`. Pure TypeScript algorithm function separated from UI. All animations via Motion (framer-motion successor) + AnimateUI components.

**Tech Stack:** Next.js 15, Tailwind CSS v4, shadcn/ui, AnimateUI, Motion v12, TypeScript, pnpm

---

### Task 1: Project Scaffolding

**Files:**
- Create: Next.js project in current directory
- Modify: `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

**Step 1: Create Next.js project**

```bash
cd "/Users/maximkudela/Documents/HTML Pages/Banker"
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack
```

If prompted about overwriting, accept. Choose defaults.

**Step 2: Install Motion**

```bash
pnpm add motion
```

**Step 3: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init -d
```

This sets up `components.json`, `lib/utils.ts`, and CSS variables.

**Step 4: Add required shadcn components**

```bash
pnpm dlx shadcn@latest add button card input label dialog toast sonner progress badge separator table
```

**Step 5: Add AnimateUI components**

```bash
pnpm dlx shadcn@latest add "https://animate-ui.com/r/sliding-number.json"
pnpm dlx shadcn@latest add "https://animate-ui.com/r/gradient-background.json"
pnpm dlx shadcn@latest add "https://animate-ui.com/r/ripple-button.json"
```

If any AnimateUI URL fails, skip it — we'll implement those effects manually with Motion.

**Step 6: Configure theme in `src/app/globals.css`**

After the existing shadcn imports, update the CSS custom properties for our light bank theme. Set warm cream background (`--background: oklch(0.98 0.01 80)`), gold primary (`--primary: oklch(0.65 0.15 70)`), and ensure card/popover colors are white-ish.

**Step 7: Update `src/app/layout.tsx`**

Set `<html lang="cs">` for Czech, update the metadata title to "Bankéřův Algoritmus" and description to "Interaktivní vizualizace bankéřova algoritmu".

**Step 8: Verify dev server runs**

```bash
pnpm dev
```

Visit `http://localhost:3000` — should see the default Next.js page with custom theme colors. Stop dev server after confirming.

**Step 9: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js project with shadcn/ui, AnimateUI, Motion"
```

---

### Task 2: Core Algorithm — Types & Safety Check

**Files:**
- Create: `src/lib/banker.ts`
- Create: `src/lib/banker.test.ts`

**Step 1: Create type definitions and algorithm in `src/lib/banker.ts`**

```typescript
// Bankéřův algoritmus — typy a čistá logika

export interface Client {
  id: number;
  name: string;
  max: number;
  allocated: number;
  need: number;
}

export interface SafetyStep {
  clientId: number;
  clientName: string;
  workBefore: number;
  canFinish: boolean;
  workAfter: number;
}

export interface SafetyResult {
  safe: boolean;
  sequence: number[];
  steps: SafetyStep[];
}

export interface RequestResult {
  approved: boolean;
  reason: "ok" | "exceeds_need" | "exceeds_available" | "unsafe";
  safetyResult?: SafetyResult;
}

export function createClient(id: number, max: number, allocated: number): Client {
  return {
    id,
    name: `K${id + 1}`,
    max,
    allocated,
    need: max - allocated,
  };
}

/**
 * Bezpečnostní kontrola (Safety Check)
 * Zjistí, zda existuje bezpečná posloupnost dokončení všech klientů.
 */
export function runSafetyCheck(
  available: number,
  clients: Client[]
): SafetyResult {
  const n = clients.length;
  const work = available;
  const finish = new Array(n).fill(false);
  const allocCopy = clients.map((c) => c.allocated);
  const needCopy = clients.map((c) => c.need);
  const sequence: number[] = [];
  const steps: SafetyStep[] = [];

  let workCurrent = work;

  // Opakuj dokud nenajdeš klienta, který může dokončit
  let found = true;
  while (found) {
    found = false;
    for (let i = 0; i < n; i++) {
      if (!finish[i]) {
        const canFinish = needCopy[i] <= workCurrent;
        const workBefore = workCurrent;
        steps.push({
          clientId: clients[i].id,
          clientName: clients[i].name,
          workBefore,
          canFinish,
          workAfter: canFinish ? workBefore + allocCopy[i] : workBefore,
        });
        if (canFinish) {
          workCurrent += allocCopy[i];
          finish[i] = true;
          sequence.push(clients[i].id);
          found = true;
        }
      }
    }
  }

  return {
    safe: finish.every(Boolean),
    sequence,
    steps,
  };
}

/**
 * Zpracuj žádost klienta o přidělení prostředků.
 * Vrátí výsledek a případně nový stav (allocated, need, available).
 */
export function processRequest(
  clientIndex: number,
  request: number,
  available: number,
  clients: Client[]
): {
  result: RequestResult;
  newAvailable: number;
  newClients: Client[];
} {
  const client = clients[clientIndex];

  // Kontrola: request <= need[k]
  if (request > client.need) {
    return {
      result: { approved: false, reason: "exceeds_need" },
      newAvailable: available,
      newClients: clients,
    };
  }

  // Kontrola: request <= available
  if (request > available) {
    return {
      result: { approved: false, reason: "exceeds_available" },
      newAvailable: available,
      newClients: clients,
    };
  }

  // Dočasné přidělení
  const tempAvailable = available - request;
  const tempClients = clients.map((c, i) =>
    i === clientIndex
      ? createClient(c.id, c.max, c.allocated + request)
      : { ...c }
  );

  // Bezpečnostní kontrola
  const safetyResult = runSafetyCheck(tempAvailable, tempClients);

  if (safetyResult.safe) {
    return {
      result: { approved: true, reason: "ok", safetyResult },
      newAvailable: tempAvailable,
      newClients: tempClients,
    };
  }

  // Rollback — vrátit původní stav
  return {
    result: { approved: false, reason: "unsafe", safetyResult },
    newAvailable: available,
    newClients: clients,
  };
}

/**
 * Validace vstupních dat.
 */
export function validateSetup(
  totalResources: number,
  clients: Client[]
): { valid: boolean; error?: string } {
  if (clients.length === 0) {
    return { valid: false, error: "Musíte přidat alespoň jednoho klienta." };
  }

  const sumMax = clients.reduce((sum, c) => sum + c.max, 0);
  if (sumMax <= totalResources) {
    return {
      valid: false,
      error:
        "Součet maximálních požadavků musí být větší než celkové prostředky bankéře. Bankéř by jinak mohl uspokojit všechny najednou a algoritmus by nebyl potřeba.",
    };
  }

  const sumAlloc = clients.reduce((sum, c) => sum + c.allocated, 0);
  if (sumAlloc > totalResources) {
    return {
      valid: false,
      error: "Součet přidělených prostředků přesahuje celkové prostředky bankéře.",
    };
  }

  for (const c of clients) {
    if (c.allocated > c.max) {
      return {
        valid: false,
        error: `Klient ${c.name}: přidělené prostředky (${c.allocated}) přesahují maximum (${c.max}).`,
      };
    }
    if (c.max < 0 || c.allocated < 0) {
      return {
        valid: false,
        error: `Klient ${c.name}: hodnoty musí být nezáporné.`,
      };
    }
  }

  return { valid: true };
}
```

**Step 2: Write tests in `src/lib/banker.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  createClient,
  runSafetyCheck,
  processRequest,
  validateSetup,
} from "./banker";

describe("createClient", () => {
  it("computes need as max - allocated", () => {
    const c = createClient(0, 10, 3);
    expect(c.need).toBe(7);
    expect(c.name).toBe("K1");
  });
});

describe("runSafetyCheck", () => {
  it("finds safe sequence for classic example", () => {
    // Total=10, Available=3 after allocations
    const clients = [
      createClient(0, 7, 1),  // need=6
      createClient(1, 4, 1),  // need=3
      createClient(2, 6, 2),  // need=4
      createClient(3, 4, 4),  // need=0
    ];
    const result = runSafetyCheck(2, clients);
    expect(result.safe).toBe(true);
    expect(result.sequence).toHaveLength(4);
    // K4 (need=0) should be first in sequence
    expect(result.sequence[0]).toBe(3);
  });

  it("detects unsafe state", () => {
    const clients = [
      createClient(0, 10, 5), // need=5
      createClient(1, 10, 5), // need=5
    ];
    // available=1, neither client can finish (both need 5)
    const result = runSafetyCheck(1, clients);
    expect(result.safe).toBe(false);
    expect(result.sequence.length).toBeLessThan(2);
  });

  it("records steps for animation", () => {
    const clients = [
      createClient(0, 3, 1), // need=2
      createClient(1, 2, 1), // need=1
    ];
    const result = runSafetyCheck(2, clients);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0]).toHaveProperty("workBefore");
    expect(result.steps[0]).toHaveProperty("canFinish");
  });
});

describe("processRequest", () => {
  it("approves valid safe request", () => {
    const clients = [
      createClient(0, 5, 1), // need=4
      createClient(1, 4, 2), // need=2
    ];
    const { result, newAvailable, newClients } = processRequest(
      1, 1, 4, clients
    );
    expect(result.approved).toBe(true);
    expect(result.reason).toBe("ok");
    expect(newAvailable).toBe(3);
    expect(newClients[1].allocated).toBe(3);
  });

  it("rejects request exceeding need", () => {
    const clients = [createClient(0, 5, 3)]; // need=2
    const { result } = processRequest(0, 3, 5, clients);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("exceeds_need");
  });

  it("rejects request exceeding available", () => {
    const clients = [createClient(0, 10, 1)]; // need=9
    const { result } = processRequest(0, 5, 3, clients);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("exceeds_available");
  });

  it("rejects unsafe request with rollback", () => {
    const clients = [
      createClient(0, 10, 5), // need=5
      createClient(1, 10, 3), // need=7
    ];
    // available=2, giving 2 to client 0 → avail=0, still unsafe
    const { result, newAvailable, newClients } = processRequest(
      0, 2, 2, clients
    );
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("unsafe");
    // Rollback: state unchanged
    expect(newAvailable).toBe(2);
    expect(newClients[0].allocated).toBe(5);
  });
});

describe("validateSetup", () => {
  it("rejects when sum(max) <= total", () => {
    const clients = [
      createClient(0, 3, 1),
      createClient(1, 3, 1),
    ];
    const result = validateSetup(10, clients);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("větší");
  });

  it("accepts valid setup", () => {
    const clients = [
      createClient(0, 7, 1),
      createClient(1, 6, 2),
    ];
    const result = validateSetup(10, clients);
    expect(result.valid).toBe(true);
  });

  it("rejects when allocated > max", () => {
    const clients = [createClient(0, 3, 5)];
    const result = validateSetup(10, clients);
    expect(result.valid).toBe(false);
  });

  it("rejects empty clients", () => {
    const result = validateSetup(10, []);
    expect(result.valid).toBe(false);
  });
});
```

**Step 3: Install vitest and run tests**

```bash
pnpm add -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

```bash
pnpm test
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/lib/banker.ts src/lib/banker.test.ts package.json pnpm-lock.yaml
git commit -m "feat: implement banker's algorithm core logic with tests"
```

---

### Task 3: State Management — useReducer

**Files:**
- Create: `src/hooks/useBankerState.ts`

**Step 1: Create the state reducer and hook**

```typescript
"use client";

import { useReducer, useCallback } from "react";
import {
  Client,
  SafetyResult,
  createClient,
  processRequest,
  validateSetup,
  runSafetyCheck,
} from "@/lib/banker";

// --- Types ---

export interface HistoryEntry {
  id: number;
  clientId: number;
  clientName: string;
  request: number;
  approved: boolean;
  reason: string;
  safeSequence?: number[];
  timestamp: Date;
}

export type Phase = "setup" | "simulation" | "safety-check";

export interface BankerState {
  totalResources: number;
  available: number;
  clients: Client[];
  phase: Phase;
  setupStep: number; // which client we're adding (0-based)
  safetyResult: SafetyResult | null;
  history: HistoryEntry[];
  error: string | null;
  pendingRequest: { clientIndex: number; amount: number } | null;
}

type Action =
  | { type: "SET_TOTAL"; total: number }
  | { type: "ADD_CLIENT"; max: number; allocated: number }
  | { type: "REMOVE_CLIENT"; id: number }
  | { type: "START_SIMULATION" }
  | { type: "SUBMIT_REQUEST"; clientIndex: number; amount: number }
  | { type: "SHOW_SAFETY_CHECK" }
  | { type: "COMPLETE_SAFETY_CHECK" }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "RESET" };

const initialState: BankerState = {
  totalResources: 0,
  available: 0,
  clients: [],
  phase: "setup",
  setupStep: 0,
  safetyResult: null,
  history: [],
  error: null,
  pendingRequest: null,
};

function reducer(state: BankerState, action: Action): BankerState {
  switch (action.type) {
    case "SET_TOTAL":
      return { ...state, totalResources: action.total, error: null };

    case "ADD_CLIENT": {
      if (state.clients.length >= 4) return state;
      const newClient = createClient(
        state.clients.length,
        action.max,
        action.allocated
      );
      const newClients = [...state.clients, newClient];
      const sumAlloc = newClients.reduce((s, c) => s + c.allocated, 0);
      return {
        ...state,
        clients: newClients,
        available: state.totalResources - sumAlloc,
        error: null,
      };
    }

    case "REMOVE_CLIENT": {
      const filtered = state.clients
        .filter((c) => c.id !== action.id)
        .map((c, i) => createClient(i, c.max, c.allocated));
      const sumAlloc = filtered.reduce((s, c) => s + c.allocated, 0);
      return {
        ...state,
        clients: filtered,
        available: state.totalResources - sumAlloc,
        error: null,
      };
    }

    case "START_SIMULATION": {
      const validation = validateSetup(state.totalResources, state.clients);
      if (!validation.valid) {
        return { ...state, error: validation.error ?? "Neplatný vstup." };
      }
      // Run initial safety check
      const initialSafety = runSafetyCheck(state.available, state.clients);
      return {
        ...state,
        phase: "simulation",
        error: null,
        safetyResult: initialSafety,
      };
    }

    case "SUBMIT_REQUEST": {
      const { clientIndex, amount } = action;
      const { result, newAvailable, newClients } = processRequest(
        clientIndex,
        amount,
        state.available,
        state.clients
      );
      const entry: HistoryEntry = {
        id: state.history.length,
        clientId: state.clients[clientIndex].id,
        clientName: state.clients[clientIndex].name,
        request: amount,
        approved: result.approved,
        reason: result.reason,
        safeSequence: result.safetyResult?.safe
          ? result.safetyResult.sequence
          : undefined,
        timestamp: new Date(),
      };
      return {
        ...state,
        available: newAvailable,
        clients: newClients,
        safetyResult: result.safetyResult ?? state.safetyResult,
        history: [entry, ...state.history],
        pendingRequest: { clientIndex, amount },
        phase: "safety-check",
      };
    }

    case "COMPLETE_SAFETY_CHECK":
      return {
        ...state,
        phase: "simulation",
        pendingRequest: null,
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export function useBankerState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setTotal = useCallback(
    (total: number) => dispatch({ type: "SET_TOTAL", total }),
    []
  );
  const addClient = useCallback(
    (max: number, allocated: number) =>
      dispatch({ type: "ADD_CLIENT", max, allocated }),
    []
  );
  const removeClient = useCallback(
    (id: number) => dispatch({ type: "REMOVE_CLIENT", id }),
    []
  );
  const startSimulation = useCallback(
    () => dispatch({ type: "START_SIMULATION" }),
    []
  );
  const submitRequest = useCallback(
    (clientIndex: number, amount: number) =>
      dispatch({ type: "SUBMIT_REQUEST", clientIndex, amount }),
    []
  );
  const completeSafetyCheck = useCallback(
    () => dispatch({ type: "COMPLETE_SAFETY_CHECK" }),
    []
  );
  const setError = useCallback(
    (error: string | null) => dispatch({ type: "SET_ERROR", error }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    setTotal,
    addClient,
    removeClient,
    startSimulation,
    submitRequest,
    completeSafetyCheck,
    setError,
    reset,
  };
}
```

**Step 2: Commit**

```bash
git add src/hooks/useBankerState.ts
git commit -m "feat: add banker state management with useReducer"
```

---

### Task 4: Setup Phase UI

**Files:**
- Create: `src/components/SetupPhase.tsx`
- Create: `src/components/ClientCardSetup.tsx`
- Create: `src/components/AnimatedNumber.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create AnimatedNumber utility component in `src/components/AnimatedNumber.tsx`**

A simple animated counting number component using Motion's `useSpring` and `useTransform`:

```typescript
"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  suffix?: string;
}

export function AnimatedNumber({ value, className, suffix = "" }: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 100, damping: 20 });
  const display = useTransform(spring, (v) =>
    `${Math.round(v).toLocaleString("cs-CZ")}${suffix}`
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}
```

**Step 2: Create ClientCardSetup component in `src/components/ClientCardSetup.tsx`**

Each client card during setup with inputs for max and allocated, 3D tilt on hover, animated border. Shows auto-calculated need. Has a remove button.

```typescript
"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "./AnimatedNumber";
import { X } from "lucide-react";

interface ClientCardSetupProps {
  id: number;
  name: string;
  max: number;
  allocated: number;
  need: number;
  onChangeMax: (val: number) => void;
  onChangeAllocated: (val: number) => void;
  onRemove: () => void;
}

export function ClientCardSetup({
  name,
  max,
  allocated,
  need,
  onChangeMax,
  onChangeAllocated,
  onRemove,
}: ClientCardSetupProps) {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateX(-y * 10);
    setRotateY(x * 10);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotateX,
        rotateY,
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ perspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative"
    >
      <Card className="border-2 border-amber-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
            <span className="text-2xl">🧑</span>
            {name}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-6 w-6 text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm text-amber-800">Maximum (max)</Label>
            <Input
              type="number"
              min={0}
              value={max || ""}
              onChange={(e) => onChangeMax(Number(e.target.value) || 0)}
              className="border-amber-300 focus:ring-amber-500 focus:border-amber-500"
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-amber-800">Přiděleno (allocated)</Label>
            <Input
              type="number"
              min={0}
              value={allocated || ""}
              onChange={(e) => onChangeAllocated(Number(e.target.value) || 0)}
              className="border-amber-300 focus:ring-amber-500 focus:border-amber-500"
              placeholder="0"
            />
          </div>
          <div className="pt-2 border-t border-amber-100">
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-700 font-medium">
                Potřebuje (need):
              </span>
              <span className="text-lg font-bold text-amber-900">
                <AnimatedNumber value={need} suffix=" Kč" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**Step 3: Create SetupPhase component in `src/components/SetupPhase.tsx`**

Main setup screen with total resources input, client cards grid, add/proceed buttons, and validation:

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClientCardSetup } from "./ClientCardSetup";
import { AnimatedNumber } from "./AnimatedNumber";
import { Client, createClient } from "@/lib/banker";
import { Plus, Play, Coins } from "lucide-react";

interface SetupPhaseProps {
  totalResources: number;
  clients: Client[];
  available: number;
  error: string | null;
  onSetTotal: (total: number) => void;
  onAddClient: (max: number, allocated: number) => void;
  onRemoveClient: (id: number) => void;
  onStart: () => void;
}

export function SetupPhase({
  totalResources,
  clients,
  available,
  error,
  onSetTotal,
  onAddClient,
  onRemoveClient,
  onStart,
}: SetupPhaseProps) {
  // Temporary state for editing client values before they're committed
  const [clientDrafts, setClientDrafts] = useState<
    { max: number; allocated: number }[]
  >([]);

  const handleAddClient = () => {
    if (clients.length >= 4) return;
    onAddClient(0, 0);
    setClientDrafts([...clientDrafts, { max: 0, allocated: 0 }]);
  };

  // We need to handle edits differently — since the reducer creates immutable clients,
  // we'll track edits in local state and update the parent through remove+add.
  // Actually, let's simplify: we manage drafts locally and only commit on "Start".

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="text-center mb-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-2">
          🏦 Bankéřův Algoritmus
        </h1>
        <p className="text-amber-700 text-lg">
          Interaktivní vizualizace přidělování prostředků
        </p>
      </motion.div>

      {/* Total Resources Input */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white/70 backdrop-blur rounded-2xl p-6 shadow-lg border-2 border-amber-200 mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
          >
            <Coins className="h-8 w-8 text-amber-600" />
          </motion.div>
          <Label className="text-xl font-semibold text-amber-900">
            Celkové prostředky banky
          </Label>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="number"
            min={0}
            value={totalResources || ""}
            onChange={(e) => onSetTotal(Number(e.target.value) || 0)}
            className="text-2xl h-14 border-amber-300 focus:ring-amber-500 max-w-xs"
            placeholder="např. 20000000"
          />
          <span className="text-xl text-amber-700 font-medium">Kč</span>
        </div>
        {totalResources > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-amber-600"
          >
            Dostupné: <AnimatedNumber value={available} suffix=" Kč" />
          </motion.p>
        )}
      </motion.div>

      {/* Client Cards Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-amber-900 mb-4">
          Klienti banky
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {clients.map((client) => (
              <ClientCardSetup
                key={client.id}
                id={client.id}
                name={client.name}
                max={client.max}
                allocated={client.allocated}
                need={client.need}
                onChangeMax={() => {
                  /* handled via parent re-render after dispatch */
                }}
                onChangeAllocated={() => {
                  /* handled via parent re-render after dispatch */
                }}
                onRemove={() => onRemoveClient(client.id)}
              />
            ))}
          </AnimatePresence>

          {/* Add Client Button */}
          {clients.length < 4 && (
            <motion.button
              onClick={handleAddClient}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border-2 border-dashed border-amber-300 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-amber-500 hover:text-amber-700 hover:border-amber-500 transition-colors min-h-[200px]"
            >
              <Plus className="h-10 w-10" />
              <span className="font-medium">Přidat klienta</span>
              <span className="text-sm">({clients.length}/4)</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Button */}
      <motion.div className="text-center">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onStart}
            size="lg"
            className="bg-amber-600 hover:bg-amber-700 text-white text-lg px-10 py-6 rounded-xl shadow-lg"
            disabled={clients.length === 0 || totalResources <= 0}
          >
            <Play className="h-5 w-5 mr-2" />
            Spustit simulaci
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
```

Note: The `SetupPhase` above is a starting point. The client card editing flow needs refinement — since `ADD_CLIENT` in the reducer sets fixed values, we'll need to either (a) manage editable drafts locally and rebuild clients on Start, or (b) add an `UPDATE_CLIENT` action. The implementing engineer should add `UPDATE_CLIENT` action to the reducer for a cleaner flow.

**Step 4: Update `src/app/page.tsx`**

```typescript
"use client";

import { AnimatePresence } from "motion/react";
import { useBankerState } from "@/hooks/useBankerState";
import { SetupPhase } from "@/components/SetupPhase";

export default function Home() {
  const {
    state,
    setTotal,
    addClient,
    removeClient,
    startSimulation,
    submitRequest,
    completeSafetyCheck,
    reset,
    setError,
  } = useBankerState();

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {state.phase === "setup" && (
          <SetupPhase
            key="setup"
            totalResources={state.totalResources}
            clients={state.clients}
            available={state.available}
            error={state.error}
            onSetTotal={setTotal}
            onAddClient={addClient}
            onRemoveClient={removeClient}
            onStart={startSimulation}
          />
        )}
        {/* SimulationPhase and SafetyCheckOverlay will be added in later tasks */}
      </AnimatePresence>
    </main>
  );
}
```

**Step 5: Run dev server and verify setup screen renders**

```bash
pnpm dev
```

Visit localhost:3000 — should see the setup screen with title, total input, add client button.

**Step 6: Commit**

```bash
git add src/components/ src/app/page.tsx
git commit -m "feat: add setup phase UI with animated client cards"
```

---

### Task 5: Setup Phase — Editable Client Cards

**Files:**
- Modify: `src/hooks/useBankerState.ts` — add `UPDATE_CLIENT` action
- Modify: `src/components/SetupPhase.tsx` — wire up editing
- Modify: `src/components/ClientCardSetup.tsx` — wire up change handlers

**Step 1: Add UPDATE_CLIENT action to the reducer**

In `src/hooks/useBankerState.ts`, add to the `Action` type:

```typescript
| { type: "UPDATE_CLIENT"; id: number; max: number; allocated: number }
```

Add the case in the reducer:

```typescript
case "UPDATE_CLIENT": {
  const updatedClients = state.clients.map((c) =>
    c.id === action.id
      ? createClient(c.id, action.max, action.allocated)
      : c
  );
  const sumAlloc = updatedClients.reduce((s, c) => s + c.allocated, 0);
  return {
    ...state,
    clients: updatedClients,
    available: state.totalResources - sumAlloc,
    error: null,
  };
}
```

Export `updateClient` callback from the hook:

```typescript
const updateClient = useCallback(
  (id: number, max: number, allocated: number) =>
    dispatch({ type: "UPDATE_CLIENT", id, max, allocated }),
  []
);
```

**Step 2: Wire SetupPhase and ClientCardSetup**

In `SetupPhase`, accept `onUpdateClient` prop and pass it down:

```typescript
onUpdateClient: (id: number, max: number, allocated: number) => void;
```

In `ClientCardSetup`, use `onChangeMax` and `onChangeAllocated` to call `onUpdateClient(id, newMax, allocated)` and `onUpdateClient(id, max, newAllocated)` respectively.

**Step 3: Wire in page.tsx**

Pass `updateClient` to `SetupPhase` as `onUpdateClient`.

**Step 4: Test interactively**

```bash
pnpm dev
```

- Set total resources to 20000000
- Add 4 clients, set their max and allocated values
- Verify need auto-calculates
- Verify available updates
- Click "Spustit simulaci" — should transition (currently shows nothing since SimulationPhase isn't built)

**Step 5: Commit**

```bash
git add src/hooks/useBankerState.ts src/components/SetupPhase.tsx src/components/ClientCardSetup.tsx src/app/page.tsx
git commit -m "feat: editable client cards with UPDATE_CLIENT action"
```

---

### Task 6: Simulation Phase UI

**Files:**
- Create: `src/components/SimulationPhase.tsx`
- Create: `src/components/VaultDisplay.tsx`
- Create: `src/components/ClientCard.tsx`
- Create: `src/components/StateTable.tsx`
- Create: `src/components/RequestForm.tsx`
- Create: `src/components/HistoryLog.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create VaultDisplay**

`src/components/VaultDisplay.tsx` — Large animated display of available resources. Shows a vault icon with glowing animated number. Uses `AnimatedNumber` for the counter. Pulses gold when value changes.

```typescript
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
      <h2 className="text-lg font-semibold text-amber-800 mb-1">
        Trezor banky
      </h2>
      <div className="text-3xl font-bold text-amber-900">
        <AnimatedNumber value={available} suffix=" Kč" />
      </div>
      <p className="text-sm text-amber-600 mt-1">
        z celkových {total.toLocaleString("cs-CZ")} Kč
      </p>
      {/* Progress bar */}
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
```

**Step 2: Create ClientCard (simulation version)**

`src/components/ClientCard.tsx` — Shows client's allocated/max/need with animated progress bar. Animated emoji reactions. Flowing gradient border.

```typescript
"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "./AnimatedNumber";
import { Client } from "@/lib/banker";

interface ClientCardProps {
  client: Client;
  isHighlighted?: boolean;
  status?: "idle" | "happy" | "worried" | "celebrating";
}

const statusEmoji = {
  idle: "🧑",
  happy: "😊",
  worried: "😟",
  celebrating: "🎉",
};

export function ClientCard({
  client,
  isHighlighted = false,
  status = "idle",
}: ClientCardProps) {
  const percentage = client.max > 0 ? (client.allocated / client.max) * 100 : 0;

  return (
    <motion.div
      layout
      layoutId={`client-${client.id}`}
      whileHover={{
        rotateX: 5,
        rotateY: 5,
        scale: 1.02,
      }}
      style={{ perspective: 800 }}
    >
      <Card
        className={`border-2 transition-all duration-300 ${
          isHighlighted
            ? "border-amber-500 shadow-lg shadow-amber-200"
            : "border-amber-200 bg-white/80"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-amber-900 flex items-center gap-2">
            <motion.span
              key={status}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-2xl"
            >
              {statusEmoji[status]}
            </motion.span>
            {client.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">Přiděleno:</span>
            <span className="font-semibold text-amber-900">
              <AnimatedNumber value={client.allocated} suffix=" Kč" />
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">Maximum:</span>
            <span className="font-semibold text-amber-900">
              {client.max.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-amber-700">Potřebuje:</span>
            <span className="font-bold text-amber-900">
              <AnimatedNumber value={client.need} suffix=" Kč" />
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden mt-2">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
              animate={{ width: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
            />
          </div>
          <p className="text-xs text-amber-500 text-right">
            {percentage.toFixed(0)}% uspokojeno
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

**Step 3: Create StateTable**

`src/components/StateTable.tsx` — Table showing all values for all clients. Rows highlight/pulse on change.

```typescript
"use client";

import { motion } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Client } from "@/lib/banker";

interface StateTableProps {
  clients: Client[];
  available: number;
}

export function StateTable({ clients, available }: StateTableProps) {
  return (
    <div className="bg-white/70 backdrop-blur rounded-xl border-2 border-amber-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-amber-50">
            <TableHead className="text-amber-900 font-bold">Klient</TableHead>
            <TableHead className="text-amber-900 font-bold text-right">
              Přiděleno
            </TableHead>
            <TableHead className="text-amber-900 font-bold text-right">
              Maximum
            </TableHead>
            <TableHead className="text-amber-900 font-bold text-right">
              Potřebuje
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <motion.tr
              key={client.id}
              layout
              className="border-b border-amber-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <TableCell className="font-medium text-amber-900">
                {client.name}
              </TableCell>
              <TableCell className="text-right">
                {client.allocated.toLocaleString("cs-CZ")} Kč
              </TableCell>
              <TableCell className="text-right">
                {client.max.toLocaleString("cs-CZ")} Kč
              </TableCell>
              <TableCell className="text-right font-semibold">
                {client.need.toLocaleString("cs-CZ")} Kč
              </TableCell>
            </motion.tr>
          ))}
          <TableRow className="bg-amber-50/50 font-bold">
            <TableCell className="text-amber-900">Dostupné</TableCell>
            <TableCell colSpan={3} className="text-right text-amber-900">
              {available.toLocaleString("cs-CZ")} Kč
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
```

**Step 4: Create RequestForm**

`src/components/RequestForm.tsx` — Form to submit a new resource request. Pick client from dropdown, enter amount, submit button with coin animation.

```typescript
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Client } from "@/lib/banker";
import { Send, HandCoins } from "lucide-react";

interface RequestFormProps {
  clients: Client[];
  onSubmit: (clientIndex: number, amount: number) => void;
}

export function RequestForm({ clients, onSubmit }: RequestFormProps) {
  const [selectedClient, setSelectedClient] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount > 0) {
      onSubmit(selectedClient, amount);
      setAmount(0);
      setIsOpen(false);
    }
  };

  return (
    <div>
      <AnimatePresence>
        {!isOpen ? (
          <motion.div
            key="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={() => setIsOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg w-full py-6 text-lg"
              >
                <HandCoins className="h-5 w-5 mr-2" />
                Nová žádost o půjčku
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-white/80 backdrop-blur rounded-xl border-2 border-amber-200 p-4 space-y-4"
          >
            <h3 className="font-semibold text-amber-900 flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              Nová žádost
            </h3>

            <div className="space-y-2">
              <Label className="text-amber-800">Klient</Label>
              <div className="grid grid-cols-4 gap-2">
                {clients.map((client, index) => (
                  <motion.button
                    key={client.id}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedClient(index)}
                    className={`p-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                      selectedClient === index
                        ? "border-amber-500 bg-amber-100 text-amber-900"
                        : "border-amber-200 text-amber-700 hover:border-amber-400"
                    }`}
                  >
                    {client.name}
                    <br />
                    <span className="text-xs">
                      potřeba: {client.need.toLocaleString("cs-CZ")}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-amber-800">Částka (Kč)</Label>
              <Input
                type="number"
                min={1}
                max={clients[selectedClient]?.need ?? 0}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="border-amber-300"
                placeholder="Zadejte částku"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white flex-1"
                disabled={amount <= 0}
              >
                <Send className="h-4 w-4 mr-2" />
                Odeslat žádost
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="border-amber-300"
              >
                Zrušit
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
```

**Step 5: Create HistoryLog**

`src/components/HistoryLog.tsx` — Animated log of past requests with colored indicators.

```typescript
"use client";

import { motion, AnimatePresence } from "motion/react";
import { HistoryEntry } from "@/hooks/useBankerState";

interface HistoryLogProps {
  entries: HistoryEntry[];
}

const reasonText: Record<string, string> = {
  ok: "Schváleno",
  exceeds_need: "Zamítnuto — přesahuje potřebu",
  exceeds_available: "Zamítnuto — nedostatek prostředků",
  unsafe: "Zamítnuto — nebezpečný stav",
};

export function HistoryLog({ entries }: HistoryLogProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center text-amber-400 py-4 text-sm">
        Zatím žádné žádosti
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            layout
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              entry.approved
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${
                entry.approved ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {entry.clientName} → {entry.request.toLocaleString("cs-CZ")} Kč
              </p>
              <p
                className={`text-xs ${
                  entry.approved ? "text-green-700" : "text-red-700"
                }`}
              >
                {reasonText[entry.reason]}
              </p>
              {entry.safeSequence && (
                <p className="text-xs text-green-600 mt-1">
                  Bezpečná posloupnost:{" "}
                  {entry.safeSequence.map((id) => `K${id + 1}`).join(" → ")}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {entry.timestamp.toLocaleTimeString("cs-CZ")}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

**Step 6: Create SimulationPhase**

`src/components/SimulationPhase.tsx` — Main simulation layout combining all above components.

```typescript
"use client";

import { motion } from "motion/react";
import { VaultDisplay } from "./VaultDisplay";
import { ClientCard } from "./ClientCard";
import { StateTable } from "./StateTable";
import { RequestForm } from "./RequestForm";
import { HistoryLog } from "./HistoryLog";
import { Client } from "@/lib/banker";
import { SafetyResult } from "@/lib/banker";
import { HistoryEntry } from "@/hooks/useBankerState";
import { Button } from "@/components/ui/button";
import { RotateCcw, ShieldCheck, ShieldX } from "lucide-react";

interface SimulationPhaseProps {
  totalResources: number;
  available: number;
  clients: Client[];
  safetyResult: SafetyResult | null;
  history: HistoryEntry[];
  onSubmitRequest: (clientIndex: number, amount: number) => void;
  onReset: () => void;
}

export function SimulationPhase({
  totalResources,
  available,
  clients,
  safetyResult,
  history,
  onSubmitRequest,
  onReset,
}: SimulationPhaseProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto px-4 py-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <h1 className="text-2xl font-bold text-amber-900">
          🏦 Simulace bankéřova algoritmu
        </h1>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            onClick={onReset}
            className="border-amber-300 text-amber-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Nová simulace
          </Button>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Vault + Request */}
        <div className="space-y-6">
          <VaultDisplay available={available} total={totalResources} />
          <RequestForm clients={clients} onSubmit={onSubmitRequest} />

          {/* Current safety status */}
          {safetyResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 rounded-xl border-2 ${
                safetyResult.safe
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {safetyResult.safe ? (
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <ShieldX className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`font-semibold ${
                    safetyResult.safe ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {safetyResult.safe ? "Bezpečný stav" : "Nebezpečný stav"}
                </span>
              </div>
              {safetyResult.safe && (
                <p className="text-sm text-green-700">
                  Posloupnost:{" "}
                  {safetyResult.sequence
                    .map((id) => `K${id + 1}`)
                    .join(" → ")}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Center column: Client cards + State table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
          <StateTable clients={clients} available={available} />

          {/* History */}
          <div className="bg-white/70 backdrop-blur rounded-xl border-2 border-amber-200 p-4">
            <h3 className="font-semibold text-amber-900 mb-3">
              📋 Historie žádostí
            </h3>
            <HistoryLog entries={history} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

**Step 7: Update page.tsx to include SimulationPhase**

In `src/app/page.tsx`, add the simulation phase rendering inside the `AnimatePresence`:

```typescript
{(state.phase === "simulation" || state.phase === "safety-check") && (
  <SimulationPhase
    key="simulation"
    totalResources={state.totalResources}
    available={state.available}
    clients={state.clients}
    safetyResult={state.safetyResult}
    history={state.history}
    onSubmitRequest={submitRequest}
    onReset={reset}
  />
)}
```

**Step 8: Test interactively and commit**

```bash
pnpm dev
```

Set up resources and clients, click Start. Verify simulation screen appears. Submit a request. Verify history updates.

```bash
git add src/components/ src/app/page.tsx
git commit -m "feat: add simulation phase with vault, client cards, request form, history"
```

---

### Task 7: Safety Check Overlay Animation

**Files:**
- Create: `src/components/SafetyCheckOverlay.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create SafetyCheckOverlay**

`src/components/SafetyCheckOverlay.tsx` — The star animation. Steps through the safety check algorithm visually:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SafetyResult, SafetyStep, Client } from "@/lib/banker";
import { AnimatedNumber } from "./AnimatedNumber";
import { ShieldCheck, ShieldX, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SafetyCheckOverlayProps {
  safetyResult: SafetyResult;
  clients: Client[];
  available: number;
  pendingRequest: { clientIndex: number; amount: number } | null;
  onComplete: () => void;
}

export function SafetyCheckOverlay({
  safetyResult,
  clients,
  available,
  pendingRequest,
  onComplete,
}: SafetyCheckOverlayProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 = intro
  const [showResult, setShowResult] = useState(false);
  const [completedClients, setCompletedClients] = useState<Set<number>>(
    new Set()
  );
  const [animatedWork, setAnimatedWork] = useState(available);
  const [isPlaying, setIsPlaying] = useState(true);

  const totalSteps = safetyResult.steps.length;

  // Auto-advance through steps
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(
      () => {
        if (currentStepIndex < totalSteps - 1) {
          const nextIndex = currentStepIndex + 1;
          setCurrentStepIndex(nextIndex);

          const step = safetyResult.steps[nextIndex];
          setAnimatedWork(step.workBefore);

          if (step.canFinish) {
            // Delay the "completion" effect
            setTimeout(() => {
              setCompletedClients((prev) => new Set([...prev, step.clientId]));
              setAnimatedWork(step.workAfter);
            }, 400);
          }
        } else {
          // All steps done, show result
          setTimeout(() => setShowResult(true), 600);
        }
      },
      currentStepIndex === -1 ? 1000 : 1200 // longer pause at start
    );

    return () => clearTimeout(timer);
  }, [currentStepIndex, isPlaying, totalSteps, safetyResult.steps]);

  const currentStep =
    currentStepIndex >= 0 ? safetyResult.steps[currentStepIndex] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-amber-900 text-center mb-2">
          🔍 Bezpečnostní kontrola
        </h2>

        {pendingRequest && (
          <p className="text-center text-amber-700 text-sm mb-4">
            Žádost: {clients[pendingRequest.clientIndex]?.name} →{" "}
            {pendingRequest.amount.toLocaleString("cs-CZ")} Kč
          </p>
        )}

        {/* Work counter */}
        <motion.div
          className="text-center mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200"
          animate={{
            borderColor: showResult
              ? safetyResult.safe
                ? "#22c55e"
                : "#ef4444"
              : "#fbbf24",
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <Coins className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Dostupné prostředky (work)
            </span>
          </div>
          <div className="text-3xl font-bold text-amber-900">
            <AnimatedNumber value={animatedWork} suffix=" Kč" />
          </div>
        </motion.div>

        {/* Client cards for safety check */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {clients.map((client) => {
            const isCurrentlyChecked = currentStep?.clientId === client.id;
            const isCompleted = completedClients.has(client.id);
            const stepForClient = currentStep?.clientId === client.id ? currentStep : null;

            return (
              <motion.div
                key={client.id}
                animate={{
                  scale: isCurrentlyChecked ? 1.05 : 1,
                  y: isCompleted ? -8 : 0,
                  borderColor: isCompleted
                    ? "#22c55e"
                    : isCurrentlyChecked
                    ? stepForClient?.canFinish
                      ? "#22c55e"
                      : "#ef4444"
                    : "#fbbf24",
                }}
                className="border-2 rounded-xl p-3 text-center bg-white"
              >
                <motion.div
                  animate={{
                    scale: isCurrentlyChecked ? [1, 1.2, 1] : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-2xl mb-1"
                >
                  {isCompleted ? "✅" : isCurrentlyChecked ? "🔍" : "🧑"}
                </motion.div>
                <p className="font-bold text-amber-900">{client.name}</p>
                <p className="text-xs text-amber-600">
                  potřeba: {client.need.toLocaleString("cs-CZ")}
                </p>
                {isCompleted && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-600 font-semibold mt-1"
                  >
                    Dokončen ✓
                  </motion.p>
                )}

                {/* Scanning beam effect */}
                {isCurrentlyChecked && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 0] }}
                    transition={{ duration: 0.6 }}
                    className="h-0.5 bg-amber-500 rounded-full mt-2"
                  />
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
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`text-center p-3 rounded-lg mb-4 ${
                currentStep.canFinish
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              <p className="text-sm">
                Kontroluji{" "}
                <strong>
                  {clients.find((c) => c.id === currentStep.clientId)?.name}
                </strong>
                : potřeba{" "}
                {clients
                  .find((c) => c.id === currentStep.clientId)
                  ?.need.toLocaleString("cs-CZ")}{" "}
                ≤ dostupné {currentStep.workBefore.toLocaleString("cs-CZ")}?{" "}
                {currentStep.canFinish ? (
                  <strong className="text-green-600">
                    ANO — klient může dokončit
                  </strong>
                ) : (
                  <strong className="text-red-600">NE — přeskakuji</strong>
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final result */}
        <AnimatePresence>
          {showResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.5, type: "spring" }}
                className="mb-4"
              >
                {safetyResult.safe ? (
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-6 py-3 rounded-full text-lg font-bold">
                    <ShieldCheck className="h-6 w-6" />
                    BEZPEČNÝ STAV
                  </div>
                ) : (
                  <motion.div
                    animate={{ x: [0, -5, 5, -5, 5, 0] }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 bg-red-100 text-red-800 px-6 py-3 rounded-full text-lg font-bold"
                  >
                    <ShieldX className="h-6 w-6" />
                    NEBEZPEČNÝ STAV
                  </motion.div>
                )}
              </motion.div>

              {safetyResult.safe && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  <p className="text-amber-700 text-sm mb-2">
                    Bezpečná posloupnost:
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {safetyResult.sequence.map((id, idx) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.15 }}
                        className="flex items-center gap-2"
                      >
                        <span className="bg-amber-100 text-amber-900 px-3 py-1 rounded-lg font-bold">
                          K{id + 1}
                        </span>
                        {idx < safetyResult.sequence.length - 1 && (
                          <span className="text-amber-400">→</span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {!safetyResult.safe && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-red-700 text-sm mb-4"
                >
                  Žádost zamítnuta — přidělení by vedlo k nebezpečnému stavu.
                  Proveden rollback.
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={onComplete}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Pokračovat
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause/Play button */}
        {!showResult && (
          <div className="text-center mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-amber-600"
            >
              {isPlaying ? "⏸ Pozastavit" : "▶ Pokračovat"}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
```

**Step 2: Wire SafetyCheckOverlay into page.tsx**

Add to `page.tsx` imports and render it when `state.phase === "safety-check"`:

```typescript
<AnimatePresence>
  {state.phase === "safety-check" && state.safetyResult && (
    <SafetyCheckOverlay
      safetyResult={state.safetyResult}
      clients={state.clients}
      available={state.available}
      pendingRequest={state.pendingRequest}
      onComplete={completeSafetyCheck}
    />
  )}
</AnimatePresence>
```

**Step 3: Test interactively**

Set up a scenario (e.g., total=10, clients with small values), submit a request, watch the safety check animation play out step by step.

**Step 4: Commit**

```bash
git add src/components/SafetyCheckOverlay.tsx src/app/page.tsx
git commit -m "feat: add animated safety check overlay with step-by-step visualization"
```

---

### Task 8: Background Animations — Floating Coins & Gradient

**Files:**
- Create: `src/components/FloatingCoins.tsx`
- Modify: `src/app/page.tsx`

**Step 1: Create FloatingCoins background component**

`src/components/FloatingCoins.tsx` — Floating coin particles that drift across the background. Uses Framer Motion infinite animations with random positions, delays, and durations.

```typescript
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
```

**Step 2: Add FloatingCoins to page.tsx**

Place it at the top of the `<main>` element, before `AnimatePresence`:

```typescript
<FloatingCoins />
```

**Step 3: Add animated gradient background to the main element**

Update the `<main>` className to include an animated gradient (using Tailwind's `animate` + custom keyframe or inline Motion animation on a background div):

Add a gradient background div after `<FloatingCoins>`:

```typescript
<motion.div
  className="fixed inset-0 -z-10"
  animate={{
    background: [
      "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
      "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FFFBEB 100%)",
      "linear-gradient(135deg, #FDE68A 0%, #FFFBEB 50%, #FEF3C7 100%)",
      "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 100%)",
    ],
  }}
  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
/>
```

**Step 4: Test and commit**

```bash
pnpm dev
```

Verify floating coins drift in the background and gradient shifts.

```bash
git add src/components/FloatingCoins.tsx src/app/page.tsx
git commit -m "feat: add floating coins and animated gradient background"
```

---

### Task 9: Polish & Enhanced Animations

**Files:**
- Modify: various components for micro-interaction polish

**Step 1: Add gold glow focus effect to all inputs**

In `src/app/globals.css`, add:

```css
input[type="number"]:focus {
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.2);
}
```

**Step 2: Add confetti effect for safe results**

In `SafetyCheckOverlay.tsx`, when the result is safe and `showResult` is true, add simple confetti-like particles:

Create a small inline confetti animation using Motion — spawn 20 small colored circles that burst outward:

```typescript
{safetyResult.safe && showResult && (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {Array.from({ length: 20 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
        style={{
          backgroundColor: ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444"][i % 4],
        }}
        initial={{ x: 0, y: 0, scale: 0 }}
        animate={{
          x: (Math.random() - 0.5) * 400,
          y: (Math.random() - 0.5) * 400,
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          delay: i * 0.05,
          ease: "easeOut",
        }}
      />
    ))}
  </div>
)}
```

**Step 3: Add "NEBEZPEČNÝ STAV" red screen flash for unsafe**

In `SafetyCheckOverlay.tsx`, when unsafe and showing result, add a brief red flash overlay:

```typescript
{!safetyResult.safe && showResult && (
  <motion.div
    initial={{ opacity: 0.5 }}
    animate={{ opacity: 0 }}
    transition={{ duration: 1 }}
    className="absolute inset-0 bg-red-500 rounded-2xl pointer-events-none"
  />
)}
```

**Step 4: Verify everything works end-to-end**

```bash
pnpm dev
```

Full flow: Setup (total + clients) → Start → Simulation → Submit request → Safety check animation → Result → Continue → Submit another request. Verify safe and unsafe scenarios both work.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add confetti, red flash, focus glow polish"
```

---

### Task 10: Final Verification & Build

**Files:**
- None new

**Step 1: Run tests**

```bash
pnpm test
```

Expected: All algorithm tests pass.

**Step 2: Run production build**

```bash
pnpm build
```

Expected: Build succeeds with no errors.

**Step 3: Test production build locally**

```bash
pnpm start
```

Visit localhost:3000, run through the full flow.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify build and finalize"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | Next.js, shadcn, Motion, AnimateUI |
| 2 | Core algorithm + tests | `src/lib/banker.ts`, `src/lib/banker.test.ts` |
| 3 | State management | `src/hooks/useBankerState.ts` |
| 4 | Setup phase UI | `SetupPhase.tsx`, `ClientCardSetup.tsx`, `AnimatedNumber.tsx` |
| 5 | Editable client cards | `UPDATE_CLIENT` action, wiring |
| 6 | Simulation phase UI | `SimulationPhase.tsx`, `VaultDisplay.tsx`, `ClientCard.tsx`, etc. |
| 7 | Safety check overlay | `SafetyCheckOverlay.tsx` — hero animation |
| 8 | Background animations | `FloatingCoins.tsx`, gradient |
| 9 | Polish & enhanced animations | Confetti, red flash, focus glow |
| 10 | Final verification & build | Tests, build, production test |
