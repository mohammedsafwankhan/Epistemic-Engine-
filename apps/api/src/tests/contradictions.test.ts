import { test, describe } from "node:test";
import assert from "node:assert";
import { detectContradictions } from "../engine/contradictionEngine.js";
import { StructuredClaim, Evidence } from "@epistemic/shared";

describe("Deterministic Contradiction Engine Tests", () => {
  const evidenceList: Evidence[] = [
    {
      id: "ev_1",
      documentId: "doc_offer",
      documentName: "Offer_Letter.pdf",
      snippet: "Must accept offer by September 30, 2026.",
      pageNumber: 1,
      confidence: 1.0,
      extractedAt: new Date().toISOString(),
    },
    {
      id: "ev_2",
      documentId: "doc_portal",
      documentName: "Portal_Instructions.pdf",
      snippet: "Must accept offer by September 20, 2026.",
      pageNumber: 1,
      confidence: 1.0,
      extractedAt: new Date().toISOString(),
    },
  ];

  test("detects conflicting deadlines for the same subject", () => {
    const claims: StructuredClaim[] = [
      {
        id: "c1",
        claimType: "DEADLINE",
        subject: "Offer Acceptance",
        predicate: "has_deadline",
        object: "September 30, 2026",
        documentId: "doc_offer",
        documentName: "Offer_Letter.pdf",
        page: 1,
        rawSnippet: "Must accept offer by September 30, 2026.",
        confidence: 0.95,
      },
      {
        id: "c2",
        claimType: "DEADLINE",
        subject: "Offer Acceptance",
        predicate: "has_deadline",
        object: "September 20, 2026",
        documentId: "doc_portal",
        documentName: "Portal_Instructions.pdf",
        page: 1,
        rawSnippet: "Must accept offer by September 20, 2026.",
        confidence: 0.95,
      },
    ];

    const conflicts = detectContradictions("proj_test", claims, evidenceList);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].type, "DEADLINE_CONFLICT");
    assert.strictEqual(conflicts[0].severity, "HIGH");
    assert.strictEqual(conflicts[0].status, "UNRESOLVED");
    assert.ok(conflicts[0].description.includes("Offer Acceptance"));
  });

  test("does not flag matching deadlines as a contradiction", () => {
    const claims: StructuredClaim[] = [
      {
        id: "c1",
        claimType: "DEADLINE",
        subject: "Offer Acceptance",
        predicate: "has_deadline",
        object: "September 30, 2026",
        documentId: "doc_offer",
        page: 1,
        rawSnippet: "Must accept offer by September 30, 2026.",
        confidence: 0.95,
      },
      {
        id: "c2",
        claimType: "DEADLINE",
        subject: "Offer Acceptance",
        predicate: "has_deadline",
        object: "September 30, 2026",
        documentId: "doc_portal",
        page: 1,
        rawSnippet: "Confirm acceptance before September 30, 2026.",
        confidence: 0.95,
      },
    ];

    const conflicts = detectContradictions("proj_test", claims, evidenceList);
    assert.strictEqual(conflicts.length, 0);
  });

  test("detects conflicting signature format requirements", () => {
    const claims: StructuredClaim[] = [
      {
        id: "c1",
        claimType: "VERIFICATION",
        subject: "Signature Method",
        predicate: "specifies_format",
        object: "Physical wet-ink signature",
        documentId: "doc_offer",
        documentName: "Offer_Letter.pdf",
        page: 1,
        rawSnippet: "Physical wet-ink signature required.",
        confidence: 0.95,
        metadata: { format: "physical" },
      },
      {
        id: "c2",
        claimType: "VERIFICATION",
        subject: "Signature Method",
        predicate: "specifies_format",
        object: "Digital electronic signature",
        documentId: "doc_portal",
        documentName: "Portal_Instructions.pdf",
        page: 1,
        rawSnippet: "Digital electronic signatures accepted via DocuSign.",
        confidence: 0.95,
        metadata: { format: "digital" },
      },
    ];

    const conflicts = detectContradictions("proj_test", claims, evidenceList);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].type, "CONFLICTING_REQUIREMENT");
    assert.strictEqual(conflicts[0].severity, "CRITICAL");
  });

  test("detects conflicting approval authorities", () => {
    const claims: StructuredClaim[] = [
      {
        id: "c1",
        claimType: "APPROVAL",
        subject: "Academic Advisor",
        predicate: "authorizes",
        object: "Academic advisor must approve cpt authorization",
        documentId: "doc_offer",
        documentName: "Univ_Guidelines.pdf",
        page: 1,
        rawSnippet: "Academic advisor must approve cpt authorization.",
        confidence: 0.92,
      },
      {
        id: "c2",
        claimType: "APPROVAL",
        subject: "Department Chair",
        predicate: "authorizes",
        object: "Department chair must approve cpt authorization",
        documentId: "doc_portal",
        documentName: "Dept_Rules.pdf",
        page: 1,
        rawSnippet: "Department chair must approve cpt authorization.",
        confidence: 0.92,
      },
    ];

    const conflicts = detectContradictions("proj_test", claims, evidenceList);
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0].type, "CONFLICTING_ISSUER");
  });
});

