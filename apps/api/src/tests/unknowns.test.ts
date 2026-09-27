import { test, describe } from "node:test";
import assert from "node:assert";
import { generateUnknowns } from "../engine/unknownEngine.js";
import { buildProcessGraph } from "../engine/graphBuilder.js";
import { StructuredClaim, Evidence } from "@epistemic/shared";

describe("Deterministic Unknowns Engine Tests", () => {
  const evidenceList: Evidence[] = [
    {
      id: "ev_1",
      documentId: "doc_1",
      snippet: "Must submit CPT authorization",
      pageNumber: 1,
      confidence: 1.0,
      extractedAt: new Date().toISOString(),
    },
  ];

  test("generates explicit unknowns when deadline and approval authority are missing", () => {
    const claims: StructuredClaim[] = [
      {
        id: "c1",
        claimType: "REQUIREMENT",
        subject: "CPT Authorization",
        predicate: "requires",
        object: "Must submit CPT authorization",
        documentId: "doc_1",
        page: 1,
        rawSnippet: "Must submit CPT authorization",
        confidence: 0.9,
      },
    ];

    const graph = buildProcessGraph("proj_test", claims, evidenceList);
    const unknowns = generateUnknowns("proj_test", claims, graph);

    assert.ok(unknowns.length >= 2);

    // Should detect missing deadline
    const missingDeadline = unknowns.find((u) => u.question.includes("deadline"));
    assert.ok(missingDeadline);
    assert.strictEqual(missingDeadline.severity, "HIGH");
    assert.strictEqual(missingDeadline.blocking, true);

    // Should detect missing approval authority for CPT
    const missingApproval = unknowns.find((u) => u.question.includes("authority"));
    assert.ok(missingApproval);
    assert.strictEqual(missingApproval.severity, "CRITICAL");
  });

  test("does not generate missing deadline unknown when deadline is explicitly declared", () => {
    const claims: StructuredClaim[] = [
      {
        id: "c1",
        claimType: "REQUIREMENT",
        subject: "Tax Compliance",
        predicate: "requires",
        object: "Must submit W-4 form",
        documentId: "doc_1",
        page: 1,
        rawSnippet: "Must submit W-4 form",
        confidence: 0.9,
      },
      {
        id: "c2",
        claimType: "DEADLINE",
        subject: "Tax Compliance",
        predicate: "has_deadline",
        object: "September 30, 2026",
        documentId: "doc_1",
        page: 1,
        rawSnippet: "Tax Compliance deadline: September 30, 2026",
        confidence: 0.95,
      },
    ];

    const graph = buildProcessGraph("proj_test", claims, evidenceList);
    const unknowns = generateUnknowns("proj_test", claims, graph);

    const deadlineUnknown = unknowns.find(
      (u) => u.question.includes("deadline") && u.question.includes("Tax Compliance")
    );
    assert.strictEqual(deadlineUnknown, undefined);
  });
});

