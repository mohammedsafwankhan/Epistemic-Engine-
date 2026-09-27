import { test, describe } from "node:test";
import assert from "node:assert";
import { evaluateCounterfactualScenario } from "../engine/counterfactualEngine.js";
import { ProcessGraph } from "@epistemic/shared";

describe("Counterfactual Reasoning Engine Tests", () => {
  const sampleGraph: ProcessGraph = {
    projectId: "proj_cf",
    nodes: [
      {
        id: "node_advisor",
        projectId: "proj_cf",
        type: "APPROVAL",
        label: "Faculty Academic Advisor Signoff",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
    ],
    edges: [],
    evidence: [],
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  test("evaluates delta when task duration is expedited by 3 days", () => {
    const res = evaluateCounterfactualScenario(
      "proj_cf",
      sampleGraph,
      [{ nodeId: "node_advisor", durationDeltaDays: -2 }],
      undefined,
      1000
    );

    assert.ok(res.baseline);
    assert.ok(res.scenario);
    assert.ok(res.scenario.expectedCompletionDays <= res.baseline.expectedCompletionDays);
  });
});

