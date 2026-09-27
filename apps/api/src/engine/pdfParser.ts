import { createRequire } from "module";

const require = createRequire(import.meta.url);

export interface ParsedPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface ParsedDocumentResult {
  documentId: string;
  fileName: string;
  totalPages: number;
  pages: ParsedPage[];
  rawText: string;
}

/**
 * Parses a document buffer (PDF or plaintext) into page-level text blocks.
 * Preserves page provenance and character counts.
 */
export async function parseDocumentBuffer(
  documentId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string = "application/pdf"
): Promise<ParsedDocumentResult> {
  if (!buffer || buffer.length === 0) {
    return {
      documentId,
      fileName,
      totalPages: 0,
      pages: [],
      rawText: "",
    };
  }

  // Handle plain text files
  if (mimeType.includes("text") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    const text = buffer.toString("utf-8");
    const pages: ParsedPage[] = [
      {
        pageNumber: 1,
        text,
        charCount: text.length,
      },
    ];
    return {
      documentId,
      fileName,
      totalPages: 1,
      pages,
      rawText: text,
    };
  }

  // Handle PDF files using pdf-parse (supporting both v2 class API and v1 function API)
  try {
    const pdfLib = require("pdf-parse");
    let rawText = "";
    let totalPages = 1;
    const pages: ParsedPage[] = [];

    if (pdfLib.PDFParse && typeof pdfLib.PDFParse === "function") {
      // pdf-parse v2 API
      const parser = new pdfLib.PDFParse({ data: buffer });
      const data = await parser.getText();
      rawText = data.text || "";
      totalPages = data.total || data.pages?.length || 1;

      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        for (const p of data.pages) {
          const cleaned = (p.text || "").trim();
          pages.push({
            pageNumber: p.num || pages.length + 1,
            text: cleaned,
            charCount: cleaned.length,
          });
        }
      }
    } else {
      // pdf-parse v1 API
      const parseFn = typeof pdfLib === "function" ? pdfLib : pdfLib.default;
      if (typeof parseFn !== "function") {
        throw new Error("Unable to initialize PDF parsing engine");
      }
      const data = await parseFn(buffer);
      rawText = data.text || "";
      totalPages = data.numpages || 1;
    }

    // Fallback page segmentation if pages array wasn't populated by parser
    if (pages.length === 0) {
      const rawPages = rawText.split(/\f|\n\s*\n---\s*Page \d+\s*---\n/);
      if (rawPages.length > 1) {
        rawPages.forEach((pText: string, idx: number) => {
          const cleaned = pText.trim();
          if (cleaned.length > 0) {
            pages.push({
              pageNumber: idx + 1,
              text: cleaned,
              charCount: cleaned.length,
            });
          }
        });
      } else {
        pages.push({
          pageNumber: 1,
          text: rawText.trim(),
          charCount: rawText.trim().length,
        });
      }
    }

    return {
      documentId,
      fileName,
      totalPages: Math.max(totalPages, pages.length),
      pages: pages.length > 0 ? pages : [
        {
          pageNumber: 1,
          text: rawText.trim(),
          charCount: rawText.trim().length,
        },
      ],
      rawText,
    };
  } catch (err: unknown) {
    // If PDF parsing fails due to invalid/corrupted PDF format
    const errorMessage = err instanceof Error ? err.message : "Unknown PDF parsing error";
    throw new Error(`Failed to parse PDF document '${fileName}': ${errorMessage}`);
  }
}

