export interface Round {
  clients: number[]
  amounts: number[]
  totalLent: number
  availableBefore: number
  availableAfter: number
}

export interface Route {
  rounds: Round[]
  totalResources: number
  needs: number[]
}

export function validateSetup(
  totalResources: number,
  needs: number[],
): string | null {
  if (totalResources < 0) {
    return "Celkové prostředky nesmí být záporné."
  }

  for (let i = 0; i < needs.length; i++) {
    if (needs[i] <= 0) {
      return `Klient ${i + 1}: požadavek musí být kladný.`
    }
  }

  const sumNeeds = needs.reduce((a, b) => a + b, 0)
  if (sumNeeds <= totalResources) {
    return `Součet požadavků (${sumNeeds.toLocaleString("cs-CZ")}) musí být větší než celkové prostředky (${totalResources.toLocaleString("cs-CZ")}). Jinak lze vše vyřídit naráz.`
  }

  if (needs.some((n) => n > totalResources)) {
    const bad = needs.findIndex((n) => n > totalResources)
    return `Klient ${bad + 1}: požadavek (${needs[bad].toLocaleString("cs-CZ")}) překračuje celkové prostředky (${totalResources.toLocaleString("cs-CZ")}).`
  }

  return null
}

/**
 * Find the minimum-rounds route to serve all clients.
 * Each round: pick a subset whose total ≤ available.
 * After each round, served clients "return" the money.
 * With ≤ 4 clients we brute-force all subset partitions.
 */
export function findShortestRoute(
  totalResources: number,
  needs: number[],
): Route {
  const n = needs.length
  const best = bruteForcePartition(totalResources, needs, n)

  const rounds: Round[] = best.map((group) => {
    const totalLent = group.reduce((s, i) => s + needs[i], 0)
    return {
      clients: group,
      amounts: group.map((i) => needs[i]),
      totalLent,
      availableBefore: totalResources,
      availableAfter: totalResources - totalLent,
    }
  })

  return { rounds, totalResources, needs }
}

function bruteForcePartition(
  capacity: number,
  needs: number[],
  n: number,
): number[][] {
  // Try partitions from 1 round up to n rounds
  // For each target number of rounds, check if a valid partition exists
  for (let numRounds = 1; numRounds <= n; numRounds++) {
    const result = tryPartition(capacity, needs, n, numRounds)
    if (result) return result
  }
  // Fallback: one client per round
  return Array.from({ length: n }, (_, i) => [i])
}

function tryPartition(
  capacity: number,
  needs: number[],
  n: number,
  targetRounds: number,
): number[][] | null {
  // Assign each client to a round (0..targetRounds-1)
  // Check that each round's total ≤ capacity
  const assignment = new Array(n).fill(0)

  function search(clientIdx: number): number[][] | null {
    if (clientIdx === n) {
      const groups: number[][] = Array.from({ length: targetRounds }, () => [])
      for (let i = 0; i < n; i++) {
        groups[assignment[i]].push(i)
      }
      // All groups must be non-empty
      if (groups.some((g) => g.length === 0)) return null
      return groups
    }

    for (let r = 0; r < targetRounds; r++) {
      assignment[clientIdx] = r
      // Check partial sum for this round
      let sum = 0
      let valid = true
      for (let i = 0; i <= clientIdx; i++) {
        if (assignment[i] === r) {
          sum += needs[i]
          if (sum > capacity) {
            valid = false
            break
          }
        }
      }
      if (valid) {
        const result = search(clientIdx + 1)
        if (result) return result
      }
    }
    return null
  }

  return search(0)
}
