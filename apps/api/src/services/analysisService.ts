import {
  ProcessGraph,
  Contradiction,
  Unknown,
  Fact,
  StructuredClaim,
  AnalysisSummary,
  ContradictionResolution,
  AdversaryAuditReport,
} from "@epistemic/shared";
import { PipelineExecutionResult } from "../engine/pipeline.js";

export interface ProjectAnalysisStore {
  summary: AnalysisSummary;
  graph: ProcessGraph;
  claims: StructuredClaim[];
  facts: Fact[];
  contradictions: Contradiction[];
  unknowns: Unknown[];
  adversaryReport?: AdversaryAuditReport;
}

export class AnalysisService {
  private analysisStore: Map<string, ProjectAnalysisStore> = new Map();

  saveAnalysis(projectId: string, result: PipelineExecutionResult): void {
    const existing = this.analysisStore.get(projectId);
    this.analysisStore.set(projectId, {
      summary: result.summary,
      graph: result.graph,
      claims: result.claims,
      facts: result.facts,
      contradictions: existing ? existing.contradictions : result.contradictions,
      unknowns: result.unknowns,
      adversaryReport: existing?.adversaryReport,
    });
  }

  getSummary(projectId: string): AnalysisSummary | null {
    return this.analysisStore.get(projectId)?.summary || null;
  }

  getGraph(projectId: string): ProcessGraph | null {
    return this.analysisStore.get(projectId)?.graph || null;
  }

  getContradictions(projectId: string): Contradiction[] {
    return this.analysisStore.get(projectId)?.contradictions || [];
  }

  resolveContradiction(
    projectId: string,
    contradictionId: string,
    resolution: ContradictionResolution
  ): Contradiction | null {
    const store = this.analysisStore.get(projectId);
    if (!store) return null;

    const index = store.contradictions.findIndex((c) => c.id === contradictionId);
    if (index === -1) return null;

    const updated: Contradiction = {
      ...store.contradictions[index],
      status: resolution.resolution === "DISPUTED" ? "DISPUTED" : "RESOLVED",
      resolution,
    };

    store.contradictions[index] = updated;
    return updated;
  }

  getUnknowns(projectId: string): Unknown[] {
    return this.analysisStore.get(projectId)?.unknowns || [];
  }

  getFacts(projectId: string): Fact[] {
    return this.analysisStore.get(projectId)?.facts || [];
  }

  saveAdversaryReport(projectId: string, report: AdversaryAuditReport): void {
    const store = this.analysisStore.get(projectId);
    if (store) {
      store.adversaryReport = report;
    }
  }

  getAdversaryReport(projectId: string): AdversaryAuditReport | null {
    return this.analysisStore.get(projectId)?.adversaryReport || null;
  }
}

export const analysisService = new AnalysisService();
