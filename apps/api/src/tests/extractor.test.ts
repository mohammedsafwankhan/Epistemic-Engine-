import { test, describe } from "node:test";
import assert from "node:assert";
import { validateClaim, extractClaimsFromDocument } from "../engine/extractor.js";
import { ParsedDocumentResult } from "../engine/pdfParser.js";

describe("Extraction Layer & Schema Validation Tests", () => {
  test("validateClaim accepts valid structured claim", () => {
    const raw = {
      claimType: "DEADLINE",
      subject: "CPT Authorization",
      predicate: "has_deadline",
      object: "September 30, 2026",
      documentId: "doc_123",
      page: 1,
      rawSnippet: "CPT application deadline: September 30, 2026",
      confidence: 0.95,
    };

    const result = validateClaim(raw);
    assert.strictEqual(result.valid, true);
    assert.ok(result.validatedClaim);
    assert.strictEqual(result.validatedClaim.subject, "CPT Authorization");
    assert.strictEqual(result.validatedClaim.confidence, 0.95);
  });

  test("validateClaim rejects malformed claim with missing required fields", () => {
    // Missing subject
    const noSubject = {
      claimType: "DEADLINE",
      predicate: "has_deadline",
      object: "September 30, 2026",
      documentId: "doc_123",
      page: 1,
      rawSnippet: "snippet",
    };
    const res1 = validateClaim(noSubject);
    assert.strictEqual(res1.valid, false);
    assert.ok(res1.reason?.includes("Subject"));

    // Invalid claimType
    const badType = {
      claimType: "INVALID_SPECULATIVE_TYPE",
      subject: "Sub",
      predicate: "pred",
      object: "obj",
      documentId: "doc_1",
      page: 1,
      rawSnippet: "snippet",
    };
    const res2 = validateClaim(badType);
    assert.strictEqual(res2.valid, false);
    assert.ok(res2.reason?.includes("claimType"));

    // Missing page number
    const badPage = {
      claimType: "FACT",
      subject: "Sub",
      predicate: "pred",
      object: "obj",
      documentId: "doc_1",
      page: -1,
      rawSnippet: "snippet",
    };
    const res3 = validateClaim(badPage);
    assert.strictEqual(res3.valid, false);
  });

  test("extractClaimsFromDocument extracts structured facts and eliminates duplicates", () => {
    const parsedDoc: ParsedDocumentResult = {
      documentId: "doc_onboarding",
      fileName: "offer_terms.txt",
      totalPages: 1,
      rawText: "Must submit W-4 form before September 30, 2026. Academic advisor must approve CPT authorization. Physical wet-ink signature required.",
      pages: [
        {
          pageNumber: 1,
          text: "Must submit W-4 form before September 30, 2026.\nAcademic advisor must approve CPT authorization.\nPhysical wet-ink signature required.\nMust submit W-4 form before September 30, 2026.", // duplicate line
          charCount: 160,
        },
      ],
    };

    const result = extractClaimsFromDocument(parsedDoc);
    assert.ok(result.claims.length >= 3);
    assert.strictEqual(result.evidence.length, 1);
    assert.strictEqual(result.rejectedClaims.length, 0);

    // Verify claim types
    const types = result.claims.map((c) => c.claimType);
    assert.ok(types.includes("DEADLINE"));
    assert.ok(types.includes("APPROVAL"));
    assert.ok(types.includes("VERIFICATION"));

    // Verify duplicate filtering: no duplicate deadline claims
    const deadlineClaims = result.claims.filter((c) => c.claimType === "DEADLINE");
    assert.strictEqual(deadlineClaims.length, 1);
  });
});

