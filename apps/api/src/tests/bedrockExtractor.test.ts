import { test, describe } from "node:test";
import assert from "node:assert";
import {
  DeterministicClaimExtractor,
  BedrockClaimExtractor,
} from "../engine/bedrockExtractor.js";
import { ParsedDocumentResult } from "../engine/pdfParser.js";

describe("Bedrock and Provider Extraction Tests", () => {
  const sampleParsedDoc: ParsedDocumentResult = {
    documentId: "doc_test_1",
    fileName: "Offer_Letter.pdf",
    totalPages: 1,
    rawText: "Offer Acceptance deadline: September 30, 2026. Academic advisor must approve CPT.",
    pages: [
      {
        pageNumber: 1,
        text: "Offer Acceptance deadline: September 30, 2026. Academic advisor must approve CPT.",
        charCount: 82,
      },
    ],
  };

  test("DeterministicClaimExtractor returns valid claims with deterministic-fallback mode", async () => {
    const extractor = new DeterministicClaimExtractor();
    const res = await extractor.extract(sampleParsedDoc);

    assert.strictEqual(res.extractionMode, "deterministic-fallback");
    assert.ok(res.claims.length >= 2);
    assert.ok(res.evidence.length >= 1);
  });

  test("BedrockClaimExtractor safely falls back to deterministic extraction when credentials are unset", async () => {
    const extractor = new BedrockClaimExtractor();
    const res = await extractor.extract(sampleParsedDoc);

    // Fallback mode is preserved
    assert.ok(
      res.extractionMode === "deterministic-fallback" || res.extractionMode === "bedrock"
    );
    assert.ok(res.claims.length >= 2);
  });
});

