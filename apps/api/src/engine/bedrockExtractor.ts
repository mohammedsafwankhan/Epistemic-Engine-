import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  StructuredClaim,
  Evidence,
} from "@epistemic/shared";
import { ParsedDocumentResult } from "./pdfParser.js";
import {
  ExtractionResult,
  extractClaimsFromDocument as runDeterministicExtraction,
  validateClaim,
} from "./extractor.js";
import { config } from "../config/env.js";

export interface ClaimExtractor {
  extract(parsedDoc: ParsedDocumentResult): Promise<ExtractionResult & { extractionMode: "bedrock" | "deterministic-fallback" }>;
}

export class DeterministicClaimExtractor implements ClaimExtractor {
  async extract(parsedDoc: ParsedDocumentResult): Promise<ExtractionResult & { extractionMode: "bedrock" | "deterministic-fallback" }> {
    const result = runDeterministicExtraction(parsedDoc);
    return {
      ...result,
      extractionMode: "deterministic-fallback",
    };
  }
}

export class BedrockClaimExtractor implements ClaimExtractor {
  private client: BedrockRuntimeClient | null = null;
  private fallbackExtractor: DeterministicClaimExtractor;
  private modelId: string;

  constructor(modelId: string = config.bedrockModelId || "anthropic.claude-3-5-sonnet-20241022-v2:0") {
    this.modelId = modelId;
    this.fallbackExtractor = new DeterministicClaimExtractor();

    // Initialize AWS Bedrock client if credentials or region are configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.client = new BedrockRuntimeClient({
        region: config.awsRegion || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  async extract(
    parsedDoc: ParsedDocumentResult
  ): Promise<ExtractionResult & { extractionMode: "bedrock" | "deterministic-fallback" }> {
    // If Bedrock client is not configured, transparently use deterministic fallback
    if (!this.client || !process.env.AWS_ACCESS_KEY_ID) {
      return this.fallbackExtractor.extract(parsedDoc);
    }

    try {
      const prompt = `You are a strict epistemic extraction agent. Extract structured process obligations, deadlines, approval verifiers, and requirements from the following document text.
Document: "${parsedDoc.fileName}" (Document ID: "${parsedDoc.documentId}")

Document Content:
${parsedDoc.rawText}

Return ONLY valid JSON with this schema:
{
  "claims": [
    {
      "claimType": "FACT" | "REQUIREMENT" | "DEADLINE" | "ACTOR" | "DOCUMENT_REQUIREMENT" | "APPROVAL" | "VERIFICATION" | "EXCEPTION",
      "subject": string,
      "predicate": string,
      "object": string,
      "documentId": "${parsedDoc.documentId}",
      "page": number (starting at 1),
      "rawSnippet": string,
      "confidence": number (0.0 to 1.0)
    }
  ]
}`;

      const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const contentText = responseBody.content?.[0]?.text || "";

      // Safely parse JSON from model output
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Bedrock response did not contain structured JSON");
      }

      const parsedJson = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsedJson.claims)) {
        throw new Error("Bedrock output missing 'claims' array");
      }

      const validatedClaims: StructuredClaim[] = [];
      const rejectedClaims: Array<{ raw: unknown; reason: string }> = [];

      for (const rawClaim of parsedJson.claims) {
        const val = validateClaim({
          ...rawClaim,
          documentId: parsedDoc.documentId,
          documentName: parsedDoc.fileName,
        });

        if (val.valid && val.validatedClaim) {
          validatedClaims.push(val.validatedClaim);
        } else {
          rejectedClaims.push({ raw: rawClaim, reason: val.reason || "Failed schema validation" });
        }
      }

      // Build evidence records
      const evidenceList: Evidence[] = parsedDoc.pages.map((p) => ({
        id: `ev_${parsedDoc.documentId}_p${p.pageNumber}`,
        documentId: parsedDoc.documentId,
        documentName: parsedDoc.fileName,
        snippet: p.text.length > 300 ? p.text.substring(0, 300) + "..." : p.text,
        pageNumber: p.pageNumber,
        confidence: 1.0,
        extractedAt: new Date().toISOString(),
      }));

      return {
        claims: validatedClaims,
        evidence: evidenceList,
        rejectedClaims,
        extractionMode: "bedrock",
      };
    } catch (err: unknown) {
      console.warn(
        `[BedrockExtractor] Bedrock invocation failed (${err instanceof Error ? err.message : "Unknown error"}). Falling back to deterministic extraction.`
      );
      // Transparent fallback on error
      return this.fallbackExtractor.extract(parsedDoc);
    }
  }
}

export const defaultExtractor: ClaimExtractor = new BedrockClaimExtractor();

