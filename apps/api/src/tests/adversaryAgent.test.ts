import { test, describe } from "node:test";
import assert from "node:assert";
import { runAdversaryAudit } from "../engine/adversaryAgent.js";
import { ProcessGraph, Contradiction, Unknown, CriticalPathItem, DurationAssumption } from "@epistemic/shared";

describe("Adversary Validation Agent Tests", () => {
  const sampleGraph: ProcessGraph = {
    projectId: "proj_adv",
    nodes: [
      {
        id: "n1",
        projectId: "proj_adv",
        type: "OBLIGATION",
        label: "Offer Sign",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
      {
        id: "n2",
        projectId: "proj_adv",
        type: "APPROVAL",
        label: "Advisor Approval",
        state: "NOT_STARTED",
        confidence: 1.0,
        evidenceIds: [],
        properties: {},
      },
    ],
    edges: [
      {
        id: "edge_unsupported",
        projectId: "proj_adv",
        source: "n1",
        target: "n2",
        type: "precedes",
        confidence: 0.9,
        evidenceIds: [], // Unsupported edge!
      },
    ],
    evidence: [],
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  const sampleContradictions: Contradiction[] = [
    {
      id: "contra_1",
      projectId: "proj_adv",
      type: "DEADLINE_CONFLICT",
      title: "Conflicting Deadlines for Offer Sign",
      description: "Sep 30 vs Sep 20",
      claimA: "Sep 30",
      claimB: "Sep 20",
      evidenceA: { id: "e1", documentId: "d1", snippet: "Sep 30", pageNumber: 1, confidence: 1, extractedAt: "" },
      evidenceB: { id: "e2", documentId: "d2", snippet: "Sep 20", pageNumber: 1, confidence: 1, extractedAt: "" },
      conflictingNodeIds: ["n1"],
      conflictingEvidenceIds: ["e1", "e2"],
      severity: "HIGH",
      status: "UNRESOLVED",
    },
  ];

  const sampleUnknowns: Unknown[] = [
    {
      id: "unk_1",
      projectId: "proj_adv",
      question: "Who is the authorization authority for CPT?",
      impactScore: 9,
      severity: "CRITICAL",
      blocking: true,
      status: "OPEN",
      affectingNodeIds: ["n2"],
      resolved: false,
    },
  ];

  const sampleCriticalPath: CriticalPathItem[] = [
    {
      nodeId: "n1",
      label: "Offer Sign",
      state: "NOT_STARTED",
      durationDays: 2,
      earlyStart: 0,
      earlyFinish: 2,
      lateStart: 0,
      lateFinish: 2,
      totalFloat: 0,
      isCritical: true,
    },
  ];

  const sampleAssumptions: DurationAssumption[] = [
    {
      task: "Advisor Approval",
      minDays: 2,
      likelyDays: 4,
      maxDays: 7,
      source: "DEMO_ASSUMPTION",
    },
  ];

  test("adversary detects unsupported edges, unresolved contradictions, demo assumptions, and blocking unknowns", () => {
    const report = runAdversaryAudit(
      "proj_adv",
      sampleGraph,
      sampleContradictions,
      sampleUnknowns,
      sampleCriticalPath,
      sampleAssumptions
    );

    assert.ok(report.totalFindings >= 4);

    const types = report.findings.map((f) => f.findingType);
    assert.ok(types.includes("UNSUPPORTED_EDGE"));
    assert.ok(types.includes("UNRESOLVED_CONTRADICTION"));
    assert.ok(types.includes("UNSUPPORTED_ASSUMPTION"));
    assert.ok(types.includes("BLOCKING_UNKNOWN"));

    assert.ok(report.criticalFindings > 0);
  });
});

