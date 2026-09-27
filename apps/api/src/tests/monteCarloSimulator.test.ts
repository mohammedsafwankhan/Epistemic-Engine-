import { test, describe } from "node:test";
import assert from "node:assert";
import { runMonteCarloSimulation } from "../engine/monteCarloSimulator.js";
import { ProcessGraph } from "@epistemic/shared";

describe("Monte Carlo Simulation Engine Tests", () => {
  const sampleGraph: ProcessGraph = {
    projectId: "proj_sim",
    nodes: [
      {
        id: "n1",
        projectId: "proj_sim",
        type: "OBLIGATION",
        label: "Offer Letter Sign",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
      {
        id: "n2",
        projectId: "proj_sim",
        type: "APPROVAL",
        label: "Academic Advisor Endorsement",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
    ],
    edges: [
      {
        id: "e1",
        projectId: "proj_sim",
        source: "n1",
        target: "n2",
        type: "precedes",
        confidence: 1.0,
        evidenceIds: [],
      },
    ],
    evidence: [],
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  test("runs 5,000 iterations and outputs bounded probabilities between 0 and 1", () => {
    const res = runMonteCarloSimulation("proj_sim", sampleGraph, undefined, 5000);

    assert.strictEqual(res.iterations, 5000);
    assert.ok(res.probabilityOfSuccess >= 0 && res.probabilityOfSuccess <= 1);
    assert.ok(res.probabilityOfDeadlineMiss >= 0 && res.probabilityOfDeadlineMiss <= 1);
    assert.ok(Math.abs(res.probabilityOfSuccess + res.probabilityOfDeadlineMiss - 1.0) < 0.01);
    assert.ok(res.expectedCompletionDays > 0);
  });
});

