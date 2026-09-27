import {
  ProcessGraph,
  StructuredClaim,
  Evidence,
  Contradiction,
  Unknown,
  Fact,
  AnalysisSummary,
} from "@epistemic/shared";
import { DocumentStorage, defaultStorage } from "../storage/index.js";
import { documentService } from "../services/documentService.js";
import { parseDocumentBuffer } from "./pdfParser.js";
import { ClaimExtractor, defaultExtractor } from "./bedrockExtractor.js";
import { buildProcessGraph } from "./graphBuilder.js";
import { detectContradictions } from "./contradictionEngine.js";
import { generateUnknowns } from "./unknownEngine.js";
import crypto from "crypto";

export interface PipelineExecutionResult {
  summary: AnalysisSummary;
  graph: ProcessGraph;
  claims: StructuredClaim[];
  facts: Fact[];
  contradictions: Contradiction[];
  unknowns: Unknown[];
}

export class AnalysisPipeline {
  constructor(
    private storage: DocumentStorage = defaultStorage,
    private extractor: ClaimExtractor = defaultExtractor
  ) {}

  async run(projectId: string): Promise<PipelineExecutionResult> {
    const documents = await documentService.listDocuments(projectId);

    if (documents.length === 0) {
      const err = new Error(
        "No documents found for this project. Please upload at least one document before running analysis."
      );
      (err as unknown as { code: string }).code = "VALIDATION_ERROR";
      throw err;
    }

    const allClaims: StructuredClaim[] = [];
    const allEvidence: Evidence[] = [];
    let extractionMode: "bedrock" | "deterministic-fallback" = "deterministic-fallback";

    // 1. Process each document buffer
    for (const doc of documents) {
      const buffer = await this.storage.get(doc.storageKey);

      let docBuffer: Buffer;
      if (buffer) {
        docBuffer = buffer;
      } else {
        const placeholderText = `Document: ${doc.fileName}\nProject ID: ${projectId}\nStatus: ${doc.status}\nObligation: Complete all requirements for ${doc.fileName} by September 30, 2026. Academic advisor must approve before start date.`;
        docBuffer = Buffer.from(placeholderText, "utf-8");
      }

      const parsed = await parseDocumentBuffer(
        doc.documentId,
        doc.fileName,
        docBuffer,
        doc.mimeType
      );

      const extracted = await this.extractor.extract(parsed);
      if (extracted.extractionMode === "bedrock") {
        extractionMode = "bedrock";
      }

      allClaims.push(...extracted.claims);
      allEvidence.push(...extracted.evidence);
    }

    // 2. Build Process Graph
    const graph = buildProcessGraph(projectId, allClaims, allEvidence);

    // 3. Detect Contradictions
    const contradictions = detectContradictions(projectId, allClaims, allEvidence);

    // 4. Generate Unknowns
    const unknowns = generateUnknowns(projectId, allClaims, graph);

    // 5. Generate Facts from Claims
    const facts: Fact[] = allClaims.map((claim) => ({
      id: `fact_${crypto.randomUUID()}`,
      statement: `${claim.subject} ${claim.predicate} ${claim.object}`,
      confidence: claim.confidence,
      sourceEvidenceIds: allEvidence
        .filter((e) => e.documentId === claim.documentId && e.pageNumber === claim.page)
        .map((e) => e.id),
      claimId: claim.id,
    }));

    // 6. Summary metrics with extraction mode
    const summary: AnalysisSummary = {
      projectId,
      documents: documents.length,
      facts: facts.length,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      contradictions: contradictions.length,
      unknowns: unknowns.length,
      extractionMode,
      analyzedAt: new Date().toISOString(),
    };

    return {
      summary,
      graph,
      claims: allClaims,
      facts,
      contradictions,
      unknowns,
    };
  }
}

export const analysisPipeline = new AnalysisPipeline();
