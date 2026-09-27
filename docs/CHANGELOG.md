# Epistemic Engine - Changelog

## [0.4.0] - Phase 4: Hackathon Polish, Trust, Adversarial Validation & Demo Experience (2026-09-19)

### Added
- **Interactive React Flow DAG Canvas**: `InteractiveGraph.tsx` dynamic React Flow canvas with custom nodes, colored state badges (`UNKNOWN`, `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`), animated edge types (`requires`, `precedes`, `authorizes`, `verifies`, `contradicts`), CPM critical path highlighting, and minimap/controls.
- **Interactive Provenance Drawer**: `ProvenanceInspector.tsx` side-panel inspector revealing verbatim source document snippets, page numbers, extraction confidence score, and extraction mode (`bedrock` vs `deterministic-fallback`).
- **Contradiction Resolution Modal & Workflow**: `ContradictionResolutionModal.tsx` side-by-side evidence diff component allowing users to accept Evidence A, Evidence B, or flag as Disputed, with instant graph updates and audit logging.
- **Adversarial Validation Agent**: `adversaryAgent.ts` autonomous audit engine that stress-tests the graph against 4 challenge classes (`UNSUPPORTED_EDGE`, `UNRESOLVED_CONTRADICTION`, `UNSUPPORTED_ASSUMPTION`, `BLOCKING_UNKNOWN`), generating a total risk score and specific remediation suggestions.
- **Adversary & Resolution REST Endpoints**: `POST /projects/:id/contradictions/:contradictionId/resolve`, `GET /projects/:id/adversary`, `POST /projects/:id/adversary/audit`.
- **Comprehensive Command Center Dashboard**: Upgraded `apps/web/app/projects/[id]/page.tsx` featuring Hero "What Would Have to Be True?" condition checklist, Interactive React Flow Canvas, Critical Path schedule, Counterfactual What-If simulator, Contradiction Resolution Center, and Adversary Audit tab.
- **Automated Verification**: 31 unit and integration tests passing with 100% success rate across 13 test suites; zero TypeScript compilation errors; Next.js 15 production build validated.

## [0.3.0] - Phase 3: Intelligence, Risk & Counterfactual Reasoning (2026-09-19)

### Added
- **Bedrock Claim Extractor with Fallback**: `bedrockExtractor.ts` introducing `ClaimExtractor` provider abstraction calling Amazon Bedrock Claude runtime when credentials are present, with automatic fallback to deterministic extraction and mode reporting (`extractionMode: "bedrock" | "deterministic-fallback"`).
- **Process State & Duration Distributions**: `NodeState` lifecycle tracking and `TaskDuration` with explicit provenance tags (`DOCUMENT_EVIDENCE`, `USER_INPUT`, `SYSTEM_PRIOR`, `DEMO_ASSUMPTION`).
- **Critical Path Method (CPM) Engine**: `criticalPathEngine.ts` computing early/late schedules, float/slack days, and identifying bottleneck tasks along the critical path.
- **Transparent Monte Carlo Simulator**: `monteCarloSimulator.ts` running 5,000 PERT/Triangular statistical trials to compute empirical deadline miss probability, expected completion dates, and variance.
- **Immutable Counterfactual Reasoning Engine**: `counterfactualEngine.ts` evaluating what-if scenarios (e.g., expedited advisor review, resolved blockers) by cloning baseline DAG state and computing delta probabilities.
- **"What Would Have to Be True?" Backward Chaining Engine**: `backwardChainingEngine.ts` traversing prerequisites from target goals, classifying conditions into `SATISFIED`, `UNCERTAIN`, `BLOCKED`, and `CONTRADICTED` states with suggested actions.
- **Intelligence REST Endpoints**: `GET /projects/:id/risk`, `POST /projects/:id/simulate`, `POST /projects/:id/counterfactual`, `GET /projects/:id/what-would-have-to-be-true`.
- **Interactive UI Upgrades**: Dashboard enriched with Probabilistic Deadline Miss Risk banner, "What Would Have to Be True?" condition checklist with target date picker, Critical Path breakdown, and interactive Counterfactual What-If simulator.
- **Full Automated Test Coverage**: 29 unit and integration tests across 11 test suites passing with zero errors.

## [0.2.0] - Phase 2: Core MVP Vertical Slice (2026-09-19)
- Real PDF ingestion, structured claim extraction, graph construction, deterministic contradictions and unknowns.

## [0.1.0] - Phase 1: Project Foundation (2026-09-19)
- Initial monorepo, shared schemas, health check, baseline API routes, and documentation.
