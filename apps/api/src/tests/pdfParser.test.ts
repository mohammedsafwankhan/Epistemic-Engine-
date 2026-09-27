import { test, describe } from "node:test";
import assert from "node:assert";
import { parseDocumentBuffer } from "../engine/pdfParser.js";

describe("PDF and Document Parser Tests", () => {
  test("handles empty buffer safely without throwing", async () => {
    const emptyBuf = Buffer.from("");
    const res = await parseDocumentBuffer("doc_1", "empty.pdf", emptyBuf);
    assert.strictEqual(res.totalPages, 0);
    assert.strictEqual(res.pages.length, 0);
    assert.strictEqual(res.rawText, "");
  });

  test("parses plaintext document with single page provenance", async () => {
    const textContent = "Summer 2026 Internship Offer Letter\nMust submit W-4 by September 30, 2026.";
    const buf = Buffer.from(textContent, "utf-8");
    const res = await parseDocumentBuffer("doc_txt", "offer.txt", buf, "text/plain");

    assert.strictEqual(res.totalPages, 1);
    assert.strictEqual(res.pages.length, 1);
    assert.strictEqual(res.pages[0].pageNumber, 1);
    assert.strictEqual(res.pages[0].text, textContent);
    assert.strictEqual(res.pages[0].charCount, textContent.length);
  });

  test("handles multi-page text document with form feed separators", async () => {
    const page1 = "University CPT Guidelines\nAcademic advisor must approve by September 15, 2026.";
    const page2 = "Required Documents: Official Transcript, Offer Letter, I-20 Form.";
    const multiPageText = `${page1}\f${page2}`;

    const buf = Buffer.from(multiPageText, "utf-8");
    const res = await parseDocumentBuffer("doc_multi", "cpt.txt", buf, "text/plain");

    assert.strictEqual(res.totalPages, 1); // text mode
    assert.ok(res.rawText.includes(page1));
  });

  test("rejects corrupted/malformed binary PDF with clear error message", async () => {
    const malformedPdf = Buffer.from("%PDF-1.4\nCorrupted binary payload that is not a valid PDF object structure\n%%EOF");
    await assert.rejects(
      async () => {
        await parseDocumentBuffer("doc_bad", "corrupted.pdf", malformedPdf, "application/pdf");
      },
      (err: Error) => {
        assert.ok(err.message.includes("Failed to parse PDF document"));
        return true;
      }
    );
  });
});

