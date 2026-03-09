# Shortest Borrowing Route Feature

## Summary

Replace the manual simulation phase with an automatic "shortest borrowing route" finder that computes the minimum number of lending rounds to serve all clients, then visualizes it as an animated walkthrough.

## Algorithm

1. Start with `available = totalResources`, all clients unserved
2. Each round: find the largest subset of remaining clients whose total need ≤ available (brute-force all 2^N subsets, N ≤ 4)
3. Served clients "finish" and return money → available stays the same
4. Repeat until all clients served
5. If any client's need > totalResources → impossible

Example: 20M bank, K1=5M, K2=5M, K3=10M, K4=9M
- Round 1: K1+K2+K4 = 19M ≤ 20M → done
- Round 2: K3 = 10M ≤ 20M → done
- Result: 2 rounds

## App Flow

```
Setup → [Start] → Route Visualization (animated) → [Reset]
```

### Removed
- SimulationPhase, RequestForm, HistoryLog, manual request flow
- SafetyCheckOverlay
- `allocated` input from ClientCardSetup (always starts at 0)

### New
- `findShortestRoute()` function in `banker.ts`
- `RouteVisualization` component — animated step-by-step walkthrough

### Kept (repurposed)
- VaultDisplay — shows available money animating during each round
- ClientCard — shows client state, highlights active clients per round
- StateTable — shows current allocation state

## Route Visualization Animation

Each round plays as a sequence:
1. "Krok X" header appears
2. Selected client cards glow/highlight
3. Vault number animates down (money lent out)
4. Clients "finish" (celebration)
5. Money returns — vault animates back up
6. Clients marked done (green, faded)
7. Next round begins

Final: "Hotovo v X krocích!" summary with full sequence.

## State Changes

- Remove `phase: "simulation" | "safety-check"` → replace with `phase: "route"`
- Remove `pendingRequest`, `history`, `safetyResult` from state
- Add `routeResult: RouteResult | null` to state
- Remove `SUBMIT_REQUEST`, `COMPLETE_SAFETY_CHECK` actions
- Add `START_ROUTE` action
- Remove `allocated` from client setup (always 0)
