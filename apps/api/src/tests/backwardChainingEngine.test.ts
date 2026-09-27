import { test, describe } from "node:test";
import assert from "node:assert";
import { evaluateWhatWouldHaveToBeTrue } from "../engine/backwardChainingEngine.js";
import { ProcessGraph, Contradiction, Unknown } from "@epistemic/shared";

describe("'What Would Have to Be True?' Engine Tests", () => {
  const sampleGraph: ProcessGraph = {
    projectId: "proj_ww",
    nodes: [
      {
        id: "node_offer",
        projectId: "proj_ww",
        type: "OBLIGATION",
        label: "Offer Acceptance",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: ["ev_1"],
        properties: {},
      },
    ],
    edges: [],
    evidence: [],
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  const sampleContradictions: Contradiction[] = [
    {
      id: "contra_1",
      projectId: "proj_ww",
      type: "DEADLINE_CONFLICT",
      title: "Conflicting Deadlines for Offer Acceptance",
      description: "Sep 30 vs Sep 20",
      claimA: "deadline Sep 30",
      claimB: "deadline Sep 20",
      evidenceA: {
        id: "e1",
        documentId: "d1",
        snippet: "Sep 30",
        pageNumber: 1,
        confidence: 1,
        extractedAt: "",
      },
      evidenceB: {
        id: "e2",
        documentId: "d2",
        snippet: "Sep 20",
        pageNumber: 1,
        confidence: 1,
        extractedAt: "",
      },
      conflictingNodeIds: ["node_offer"],
      conflictingEvidenceIds: ["e1", "e2"],
      severity: "HIGH",
      status: "DETECTED",
    },
  ];

  const sampleUnknowns: Unknown[] = [];

  test("classifies contradicted condition as CONTRADICTED with CRITICAL impact", () => {
    const res = evaluateWhatWouldHaveToBeTrue(
      "proj_ww",
      sampleGraph,
      sampleContradictions,
      sampleUnknowns
    );

    assert.strictEqual(res.totalConditions, 1);
    assert.strictEqual(res.contradictedCount, 1);
    assert.strictEqual(res.achievable, false);
    assert.strictEqual(res.conditions[0].status, "CONTRADICTED");
    assert.strictEqual(res.conditions[0].impact, "CRITICAL");
  });
});

