import { test, describe } from "node:test";
import assert from "node:assert";
import { calculateCriticalPath } from "../engine/criticalPathEngine.js";
import { ProcessGraph } from "@epistemic/shared";

describe("Critical Path Method (CPM) Engine Tests", () => {
  const sampleGraph: ProcessGraph = {
    projectId: "proj_cpm",
    nodes: [
      {
        id: "node_offer",
        projectId: "proj_cpm",
        type: "OBLIGATION",
        label: "Offer Letter Sign",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
      {
        id: "node_advisor",
        projectId: "proj_cpm",
        type: "APPROVAL",
        label: "Academic Advisor Endorsement",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
      {
        id: "node_cpt",
        projectId: "proj_cpm",
        type: "OBLIGATION",
        label: "CPT Authorization Processing",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
    ],
    edges: [
      {
        id: "e1",
        projectId: "proj_cpm",
        source: "node_offer",
        target: "node_advisor",
        type: "precedes",
        confidence: 1.0,
        evidenceIds: [],
      },
      {
        id: "e2",
        projectId: "proj_cpm",
        source: "node_advisor",
        target: "node_cpt",
        type: "authorizes",
        confidence: 1.0,
        evidenceIds: [],
      },
    ],
    evidence: [],
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  test("computes early/late schedule and total expected duration", () => {
    const result = calculateCriticalPath(sampleGraph);

    assert.ok(result.totalExpectedDays > 0);
    assert.strictEqual(result.schedule.length, 3);
    assert.ok(result.criticalPath.length > 0);

    // Verify assumptions provenance
    assert.ok(result.assumptions.length >= 3);
    for (const a of result.assumptions) {
      assert.ok(
        ["DOCUMENT_EVIDENCE", "USER_INPUT", "SYSTEM_PRIOR", "DEMO_ASSUMPTION"].includes(
          a.source
        )
      );
    }
  });
});

