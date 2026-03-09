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
  const finish = new Array(n).fill(false);
  const allocCopy = clients.map((c) => c.allocated);
  const needCopy = clients.map((c) => c.need);
  const sequence: number[] = [];
  const steps: SafetyStep[] = [];

  let workCurrent = available;

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

  if (request > client.need) {
    return {
      result: { approved: false, reason: "exceeds_need" },
      newAvailable: available,
      newClients: clients,
    };
  }

  if (request > available) {
    return {
      result: { approved: false, reason: "exceeds_available" },
      newAvailable: available,
      newClients: clients,
    };
  }

  const tempAvailable = available - request;
  const tempClients = clients.map((c, i) =>
    i === clientIndex
      ? createClient(c.id, c.max, c.allocated + request)
      : { ...c }
  );

  const safetyResult = runSafetyCheck(tempAvailable, tempClients);

  if (safetyResult.safe) {
    return {
      result: { approved: true, reason: "ok", safetyResult },
      newAvailable: tempAvailable,
      newClients: tempClients,
    };
  }

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
      error: "Součet maximálních požadavků musí být větší než celkové prostředky bankéře. Bankéř by jinak mohl uspokojit všechny najednou a algoritmus by nebyl potřeba.",
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
