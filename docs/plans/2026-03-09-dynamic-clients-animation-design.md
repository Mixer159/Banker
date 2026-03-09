# Dynamic Clients & Animated Route Visualization

## Overview

Two enhancements to the Banker's Algorithm visualizer:

1. **Variable client count** (2-8) with +/- buttons
2. **Step-by-step animated walkthrough** of the computed route with play/pause controls

Approach: single-page inline animation (Approach A). Setup at top, animated result expands below after computation.

---

## 1. Setup Phase — Dynamic Clients

- Client count range: 2-8 (default: 2)
- +/- buttons next to "Klienti" header
- `-` disabled at 2 clients, `+` disabled at 8
- Client cards in responsive 2-column grid using existing `Card` component
- Each card: "Klient N" label + need input
- Adding appends a new empty card with scale-in animation (Framer Motion)
- Removing always removes the last client
- Subtitle updates dynamically: "Zadejte celkove prostredky a pozadavky N klientu"

## 2. Animated Route Visualization

### Layout

- **Top bar:** title + animated "Dostupne prostredky: X Kc" + play/pause/reset controls
- **Client cards row:** grid of small cards showing each client's need and status (waiting / being served / done)
- **Current round panel:** shows what's happening in the active round

### Animation State Machine (per round)

| Phase     | Duration | What happens                                                                 |
|-----------|----------|------------------------------------------------------------------------------|
| Highlight | ~800ms   | Served clients get colored border/glow, others dimmed                        |
| Lend      | ~1000ms  | Available resources animate down, client cards show "-X Kc" deduction        |
| Return    | ~1000ms  | Resources animate back up, served clients marked "done" (checkmark, green)   |
| Pause     | ~600ms   | Brief pause before next round                                                |

After all rounds: summary badge "Vsichni klienti obslouzeni v N kolech" with full sequence.

### Controls

- **Play/Pause** — auto-advance through rounds
- **Step** (next arrow) — manually advance one phase
- **Reset** — return to setup

### Tech

- Framer Motion for all animations (scale, opacity, color, spring-animated numbers)
- State machine: `useEffect` + `setTimeout` chain driven by `playing` boolean and `currentPhase` state
- Animated number component using `useSpring` / `useTransform` from Framer Motion

---

## Constraints

- Czech language throughout
- Algorithm stays unchanged (`findShortestRoute` in `lib/banker.ts`)
- Max 8 clients (brute-force partition is O(k^n), acceptable for n<=8)
- Dark/light mode support via existing theme provider
