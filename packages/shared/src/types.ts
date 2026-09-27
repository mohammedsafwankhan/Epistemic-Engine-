/**
 * Epistemic Engine Canonical Types & Schemas
 * Core domain model representing facts, evidence, obligations,
 * dependencies, deadlines, contradictions, unknowns, and graph state.
 */

// ==========================================
// 1. Process & Project Models
// ==========================================

export type ProcessType =
  | "INTERNSHIP_ONBOARDING"
  | "SCHOLARSHIP_APPLICATION"
  | "VISA_PERMIT"
  | "COMPLIANCE_WORKFLOW"
  | "HEALTHCARE_ADMINISTRATION"
  | "GENERIC_PROCESS";

export type ProjectStatus =
  | "DRAFT"
  | "READY_FOR_ANALYSIS"
  | "ANALYZING"
  | "ANALYZED"
  | "FAILED";

export interface Project {
  id: string;
  name: string;
  processType: ProcessType;
  description?: string;
  status: ProjectStatus;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CreateProjectRequest {
  name: string;
  processType: ProcessType;
  description?: string;
}

// ==========================================
// 2. Document & Version Models
// ==========================================

export type DocumentStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED";

export interface DocumentVersion {
  versionId: string;
  storageKey: string;
  size: number;
  uploadedAt: string;
  hash?: string;
}

export interface Document {
  documentId: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  versions?: DocumentVersion[];
  extractedTextKey?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateDocumentRequest {
  fileName: string;
  mimeType: string;
  size: number;
}

// ==========================================
// 3. Claims & Evidence Schemas
// ==========================================

export type ClaimType =
  | "FACT"
  | "REQUIREMENT"
  | "DEADLINE"
  | "ACTOR"
  | "DOCUMENT_REQUIREMENT"
  | "APPROVAL"
  | "VERIFICATION"
  | "EXCEPTION";

export interface Evidence {
  id: string;
  documentId: string;
  documentName?: string;
  snippet: string;
  pageNumber: number;
  startOffset?: number;
  endOffset?: number;
  confidence: number;
  extractedAt: string;
}

export interface StructuredClaim {
  id: string;
  claimType: ClaimType;
  subject: string;
  predicate: string;
  object: string;
  documentId: string;
  documentName?: string;
  page: number;
  startOffset?: number;
  endOffset?: number;
  rawSnippet: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface Fact {
  id: string;
  statement: string;
  confidence: number;
  sourceEvidenceIds: string[];
  claimId?: string;
}

// ==========================================
// 4. Process State, Durations & Epistemic Graph
// ==========================================

export type NodeType =
  | "DOCUMENT"
  | "OBLIGATION"
  | "ACTOR"
  | "DEADLINE"
  | "APPROVAL"
  | "VERIFICATION"
  | "EVIDENCE"
  | "UNKNOWN"
  | "EVENT";

export type EdgeType =
  | "requires"
  | "precedes"
  | "authorizes"
  | "verifies"
  | "contradicts"
  | "substitutes"
  | "unknown_link";

export type NodeState =
  | "UNKNOWN"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING"
  | "COMPLETED"
  | "VERIFIED"
  | "BLOCKED"
  | "FAILED"
  | "EXPIRED";

export type DurationSource =
  | "DOCUMENT_EVIDENCE"
  | "USER_INPUT"
  | "SYSTEM_PRIOR"
  | "DEMO_ASSUMPTION";

export interface TaskDuration {
  minDays: number;
  likelyDays: number;
  maxDays: number;
  source: DurationSource;
  description?: string;
}

export interface Node {
  id: string;
  projectId: string;
  type: NodeType;
  label: string;
  description?: string;
  confidence: number;
  state: NodeState;
  duration?: TaskDuration;
  evidenceIds: string[];
  properties: Record<string, unknown>;
}

export interface Edge {
  id: string;
  projectId: string;
  source: string;
  target: string;
  type: EdgeType;
  weight?: number;
  confidence: number;
  evidenceIds: string[];
  properties?: Record<string, unknown>;
}

export interface ProcessGraph {
  projectId: string;
  nodes: Node[];
  edges: Edge[];
  evidence: Evidence[];
  version: number;
  updatedAt: string;
}

// ==========================================
// 5. Contradictions & Resolution Workflow
// ==========================================

export interface Obligation {
  id: string;
  projectId: string;
  title: string;
  assignee?: string;
  mandatory: boolean;
  status: "PENDING" | "SATISFIED" | "BLOCKED" | "OVERDUE";
  dueDate?: string;
  dependentNodeIds: string[];
}

export interface Deadline {
  id: string;
  projectId: string;
  nodeId: string;
  date: string;
  isHardDeadline: boolean;
  sourceEvidenceId?: string;
}

export type ContradictionType =
  | "DEADLINE_CONFLICT"
  | "CONFLICTING_REQUIREMENT"
  | "CONFLICTING_THRESHOLD"
  | "CONFLICTING_ISSUER";

export type ContradictionStatus = "UNRESOLVED" | "DISPUTED" | "RESOLVED" | "DETECTED";

export interface ContradictionResolution {
  resolution: "ACCEPTED_A" | "ACCEPTED_B" | "DISPUTED" | "CUSTOM";
  selectedEvidenceId?: string;
  notes?: string;
  resolvedAt: string;
  resolvedBy?: string;
}

export interface Contradiction {
  id: string;
  projectId: string;
  type: ContradictionType;
  title: string;
  description: string;
  claimA: string;
  claimB: string;
  evidenceA: Evidence;
  evidenceB: Evidence;
  conflictingNodeIds: string[];
  conflictingEvidenceIds: string[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: ContradictionStatus;
  resolution?: ContradictionResolution;
}

export interface Unknown {
  id: string;
  projectId: string;
  question: string;
  impactScore: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  blocking: boolean;
  status: "OPEN" | "RESOLVED";
  affectingNodeIds: string[];
  suggestedAction?: string;
  resolved: boolean;
}

export interface Constraint {
  id: string;
  projectId: string;
  expression: string;
  description: string;
}

// ==========================================
// 6. Adversary Validation Agent Models
// ==========================================

export type AdversaryFindingType =
  | "UNSUPPORTED_EDGE"
  | "UNRESOLVED_CONTRADICTION"
  | "UNSUPPORTED_ASSUMPTION"
  | "BLOCKING_UNKNOWN"
  | "PREMATURE_COMPLETION";

export interface AdversaryFinding {
  id: string;
  findingType: AdversaryFindingType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  targetId: string;
  targetLabel: string;
  reason: string;
  suggestedChallenge: string;
  evidence?: Evidence[];
}

export interface AdversaryAuditReport {
  projectId: string;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  findings: AdversaryFinding[];
  auditedAt: string;
}

// ==========================================
// 7. Critical Path, Simulation & Risk Models
// ==========================================

export interface CriticalPathItem {
  nodeId: string;
  label: string;
  state: NodeState;
  durationDays: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  isCritical: boolean;
}

export interface DurationAssumption {
  task: string;
  minDays: number;
  likelyDays: number;
  maxDays: number;
  source: DurationSource;
  evidenceSnippet?: string;
}

export interface SimulationResult {
  projectId: string;
  targetDate: string;
  iterations: number;
  probabilityOfSuccess: number;
  probabilityOfDeadlineMiss: number;
  expectedCompletionDays: number;
  expectedCompletionDate: string;
  criticalPath: CriticalPathItem[];
  floatDays: number;
  assumptions: DurationAssumption[];
  simulatedAt: string;
}

export interface RiskAnalysisResult {
  projectId: string;
  targetDeadline: string;
  probabilityOfMiss: number;
  probabilityOfSuccess: number;
  expectedCompletionDate: string;
  expectedCompletionDays: number;
  criticalPath: CriticalPathItem[];
  blockingUnknowns: Unknown[];
  topRiskFactors: string[];
  assumptions: DurationAssumption[];
}

export interface CounterfactualChange {
  nodeId: string;
  durationDeltaDays?: number;
  state?: NodeState;
  resolved?: boolean;
}

export interface CounterfactualResult {
  projectId: string;
  baseline: SimulationResult;
  scenario: SimulationResult;
  deltaProbability: number;
  deltaCompletionDays: number;
  changesApplied: CounterfactualChange[];
}

// ==========================================
// 8. "What Would Have to Be True?" & Provenance Models
// ==========================================

export type ProcessConditionStatus =
  | "SATISFIED"
  | "UNCERTAIN"
  | "BLOCKED"
  | "CONTRADICTED";

export interface ProcessCondition {
  id: string;
  description: string;
  status: ProcessConditionStatus;
  requiredFor: string[];
  evidenceIds: string[];
  evidenceSnippet?: string;
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedSlackDays?: number;
  suggestedAction?: string;
}

export interface WhatWouldHaveToBeTrueResult {
  projectId: string;
  target: string;
  targetDate: string;
  achievable: boolean;
  totalConditions: number;
  satisfiedCount: number;
  uncertainCount: number;
  blockedCount: number;
  contradictedCount: number;
  conditions: ProcessCondition[];
  criticalConditions: ProcessCondition[];
  evaluatedAt: string;
}

export interface ProvenanceRecord {
  claimText: string;
  documentName: string;
  pageNumber: number;
  snippet: string;
  confidence: number;
  extractionMode: "bedrock" | "deterministic-fallback";
  status: "Supported" | "Probable" | "Disputed" | "Unknown";
}

export interface AnalysisSummary {
  projectId: string;
  documents: number;
  facts: number;
  nodes: number;
  edges: number;
  contradictions: number;
  unknowns: number;
  extractionMode?: "bedrock" | "deterministic-fallback";
  analyzedAt: string;
}

// ==========================================
// 9. API Error & Response Envelopes
// ==========================================

export interface ApiError {
  code:
    | "VALIDATION_ERROR"
    | "NOT_FOUND"
    | "INTERNAL_ERROR"
    | "NOT_IMPLEMENTED"
    | "UNAUTHORIZED";
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  service: string;
  timestamp: string;
  version: string;
}
