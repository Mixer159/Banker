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
    const clients = [
      createClient(0, 7, 1),
      createClient(1, 4, 1),
      createClient(2, 6, 2),
      createClient(3, 4, 4),
    ];
    const result = runSafetyCheck(2, clients);
    expect(result.safe).toBe(true);
    expect(result.sequence).toHaveLength(4);
    expect(result.sequence[0]).toBe(3);
  });

  it("detects unsafe state", () => {
    const clients = [
      createClient(0, 10, 5),
      createClient(1, 10, 5),
    ];
    const result = runSafetyCheck(1, clients);
    expect(result.safe).toBe(false);
    expect(result.sequence.length).toBeLessThan(2);
  });

  it("records steps for animation", () => {
    const clients = [
      createClient(0, 3, 1),
      createClient(1, 2, 1),
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
      createClient(0, 5, 1),
      createClient(1, 4, 2),
    ];
    const { result, newAvailable, newClients } = processRequest(1, 1, 4, clients);
    expect(result.approved).toBe(true);
    expect(result.reason).toBe("ok");
    expect(newAvailable).toBe(3);
    expect(newClients[1].allocated).toBe(3);
  });

  it("rejects request exceeding need", () => {
    const clients = [createClient(0, 5, 3)];
    const { result } = processRequest(0, 3, 5, clients);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("exceeds_need");
  });

  it("rejects request exceeding available", () => {
    const clients = [createClient(0, 10, 1)];
    const { result } = processRequest(0, 5, 3, clients);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("exceeds_available");
  });

  it("rejects unsafe request with rollback", () => {
    const clients = [
      createClient(0, 10, 5),
      createClient(1, 10, 3),
    ];
    const { result, newAvailable, newClients } = processRequest(0, 2, 2, clients);
    expect(result.approved).toBe(false);
    expect(result.reason).toBe("unsafe");
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
