# Epistemic Engine - Task Tracker

## Phase 1: Project Foundation (COMPLETED)
- [x] Monorepo & Workspaces (`packages/shared`, `apps/api`, `apps/web`)
- [x] Canonical domain schemas
- [x] Health check & Basic Project CRUD
- [x] Initial documentation suite

## Phase 2: Core MVP Vertical Slice (COMPLETED)
- [x] Real PDF & Document Ingestion (`apps/api/src/engine/pdfParser.ts`)
- [x] Page-level evidence extraction & provenance tracking
- [x] Structured Claim Extractor with strict validation (`apps/api/src/engine/extractor.ts`)
- [x] Process Graph construction (`apps/api/src/engine/graphBuilder.ts`)
- [x] Deterministic Contradiction Detection Engine (`apps/api/src/engine/contradictionEngine.ts`)
- [x] Deterministic Unknowns Engine (`apps/api/src/engine/unknownEngine.ts`)
- [x] Full Analysis Pipeline (`apps/api/src/engine/pipeline.ts`)

## Phase 3: Intelligence, Risk & Counterfactual Reasoning (COMPLETED)
- [x] Bedrock Claim Extractor with transparent deterministic fallback (`apps/api/src/engine/bedrockExtractor.ts`)
- [x] Process-state tracking (`NodeState`) and duration distributions with source provenance
- [x] Critical Path Method (CPM) DAG calculation (`apps/api/src/engine/criticalPathEngine.ts`)
- [x] 5,000-iteration Monte Carlo PERT timeline simulation (`apps/api/src/engine/monteCarloSimulator.ts`)
- [x] Immutable Counterfactual Scenario Engine (`apps/api/src/engine/counterfactualEngine.ts`)
- [x] "What Would Have to Be True?" backward-chaining condition engine (`apps/api/src/engine/backwardChainingEngine.ts`)
- [x] Intelligence REST APIs (`/risk`, `/simulate`, `/counterfactual`, `/what-would-have-to-be-true`)
- [x] Interactive Dashboard UI upgrade (Probabilistic failure banner, "What Would Have to Be True?" condition checklist, Critical Path timeline, and Counterfactual What-If simulator)
- [x] 29 automated unit and integration tests passing

## Phase 4: Hackathon Polish, Trust, Adversarial Validation & Demo Experience (COMPLETED)
- [x] Interactive React Flow DAG canvas with animated status edges, color-coded node states, and CPM highlights (`apps/web/components/InteractiveGraph.tsx`)
- [x] Interactive Provenance Drawer with verbatim source snippet, page number, confidence score, and extraction mode (`apps/web/components/ProvenanceInspector.tsx`)
- [x] Contradiction Resolution Center & side-by-side evidence comparison modal (`apps/web/components/ContradictionResolutionModal.tsx`)
- [x] Adversarial Validation Engine discovering unsupported edges, unresolved contradictions, demo assumptions, and blocking unknowns (`apps/api/src/engine/adversaryAgent.ts`)
- [x] Contradiction resolution and adversary REST endpoints (`POST /projects/:id/contradictions/:contradictionId/resolve`, `GET/POST /projects/:id/adversary`)
- [x] Comprehensive automated test coverage (31 passing unit and integration tests)

## Phase 5: Verification, Demo Hardening & Release Readiness (COMPLETED)
- [x] Frozen deterministic demo dataset in `demo-data/` (5 onboarding documents producing 2-3 contradictions, 2-3 unknowns, 1 critical path)
- [x] Golden demo path end-to-end integration test suite (`apps/api/src/tests/demoGoldenPath.test.ts`)
- [x] Rigorous Risk & Counterfactual Sanity checks verified
- [x] Probability transparency standardized with approved terminology ("Estimated under modeled assumptions")
- [x] Terminology review and alignment to "Adversarial Validation Engine"
- [x] 32 automated unit and integration tests passing (100% success rate across 13 suites)
- [x] Clean TypeScript typecheck and Next.js 15 production build
