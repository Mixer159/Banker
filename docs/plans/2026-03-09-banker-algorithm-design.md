# Banker's Algorithm Interactive Visualizer — Design Document

## Overview

An interactive Next.js web application that visualizes the Banker's Algorithm with rich animations and a bank/financial theme. The app allows users to set up a banking scenario with total resources and up to 4 clients, then simulate resource allocation requests with animated safety checks.

## Tech Stack

- **Next.js 15** (App Router) — single-page application
- **Tailwind CSS v4** — styling
- **shadcn/ui** — form inputs, cards, buttons, dialogs, toasts
- **Framer Motion** — page transitions, layout animations, coin animations
- **AnimateUI** — enhanced animated components (animated numbers, borders)
- **TypeScript** — type safety
- **pnpm** — package manager

## Language

All UI text in **Czech** (Klient, Prostředky, Bezpečná posloupnost, etc.)

## Theme

**Light theme** with warm cream/beige background, deep gold/amber accents, green for safe states, red for unsafe/rejected states. Bank/vault aesthetic.

## Architecture

### Single-Page State Machine

One Next.js page (`/`) with a state machine driving the flow:

```
setup → simulation → safety-check (overlay) → simulation
```

All state managed via React `useReducer`. No external state libraries.

### Data Model

```typescript
interface Client {
  id: number;           // 0-3
  name: string;         // "K1"-"K4"
  max: number;          // maximální požadavek
  allocated: number;    // aktuálně přiděleno
  need: number;         // max - allocated
}

interface BankerState {
  totalResources: number;
  available: number;
  clients: Client[];
  phase: "setup" | "simulation" | "safety-check";
  safetyResult: SafetyResult | null;
  history: HistoryEntry[];
}

interface SafetyResult {
  safe: boolean;
  sequence: number[];
  steps: SafetyStep[];
}

interface SafetyStep {
  clientId: number;
  workBefore: number;
  canFinish: boolean;
  workAfter: number;
}

interface HistoryEntry {
  id: number;
  clientId: number;
  request: number;
  approved: boolean;
  timestamp: Date;
  safeSequence?: number[];
}
```

### Core Algorithm

Pure TypeScript function `runSafetyCheck(available, allocated[], need[])` returns `{ safe, sequence, steps }`. Separate from UI for testability.

## User Flow

### Screen 1 — "Banka" (Setup)

- Animated header: "Bankéřův Algoritmus"
- Input: "Celkové prostředky banky" with animated coin icon
- Card grid: start empty, "+" button to add clients (up to 4)
- Each client card: name (K1-K4), Přiděleno (allocated), Maximum (max), auto-calculated Need
- Validation: sum(max) > totalResources required
- "Spustit" button to proceed

### Screen 2 — "Simulace" (Simulation)

- Top: animated vault showing Available (animated counter)
- Center: 4 client cards with animated progress bars (allocated/max/need)
- State table with all values
- "Nová žádost" button → form: pick client (K1-K4) + enter amount
- History log panel with animated entries

### Screen 3 — "Bezpečnostní kontrola" (Safety Check Overlay)

Step-by-step animated safety check:
1. Shows all clients with need values
2. Work counter starts at Available
3. Algorithm iterates through clients:
   - Highlights client being checked
   - If need[i] <= work: green flash, coins flow back, mark finished, work += allocated[i]
   - If need[i] > work: red flash, skip
4. Safe → confetti + sequence display
5. Unsafe → red overlay + rollback animation

## Animations

### Background & Atmosphere
- Floating coin particles (Framer Motion infinite loop)
- Animated gradient mesh background (cream → gold → cream)
- Vault door opening when setup → simulation

### Micro-Interactions
- Buttons: scale on hover (1.05), shadow lift
- Inputs: gold glow on focus
- Customer cards: 3D tilt on hover (rotateX/rotateY)
- Numbers: spring-based slot machine counter animations
- Tooltips: spring entrance

### Customer Card Enhancements
- Animated avatar/icon reactions (happy, worried, celebrating)
- Liquid/wave progress bar fill
- Flowing gradient border (AnimateUI animated-border)

### Safety Check (Hero Animation)
- 500ms dramatic pauses between steps
- Light beam scanning animation across customers
- Finished clients lift and float to completed row with confetti
- Coins drop into pool with physics bounce
- Safe: trophy animation, clients line up in order
- Unsafe: red flash, "NEBEZPEČNÝ STAV" text shakes, coins reverse in slow motion

### Request Submission
- Coin loading spinner
- Coins split and fly to client
- Accept: green pulse wave from client card
- Reject: coins bounce off invisible wall, fly back to vault

### History Log
- Entries slide in from right with stagger
- Colored dots (green/red) and timestamps

## Component Tree

```
App (page.tsx)
├── SetupPhase
│   ├── TotalResourcesInput
│   ├── ClientCardSetup[]
│   └── ProceedButton
├── SimulationPhase
│   ├── VaultDisplay
│   ├── ClientGrid
│   │   └── ClientCard[]
│   ├── RequestForm
│   ├── StateTable
│   └── HistoryLog
├── SafetyCheckOverlay
│   ├── CheckAnimation
│   └── ResultDisplay
└── FloatingCoins
```

## Validation Rules

1. `sum(max[i]) > totalResources` — required (per assignment)
2. `allocated[i] <= max[i]` for each client
3. `sum(allocated[i]) <= totalResources`
4. Request: `request <= need[k]`
5. Request: `request <= available`

## Algorithm Steps (Per Request)

1. Verify `request <= need[k]` → reject if not
2. Verify `request <= available` → "nelze nyní uspokojit" if not
3. Tentatively allocate: `available -= request`, `allocated[k] += request`, `need[k] -= request`
4. Run safety check
5. Safe → commit allocation, show safe sequence
6. Unsafe → rollback, show rejection
