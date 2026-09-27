# Epistemic Engine

> **Context Zero for Real-World Processes**
> 
> *Compiling fragmented documents into structured evidence, dependency graphs, contradictions, unknowns, and actionable risk.*

---

## 1. The Problem
Real-world processes—such as university internship onboarding, immigration compliance, grant applications, and corporate approvals—are distributed programs executed by humans. However, their rules are scattered across unstructured PDFs, email threads, offer letters, policy checklists, and departmental websites.

Conventional Document AI (e.g. Chat-with-PDF or basic RAG) only answers keyword queries in isolation. It cannot:
- Detect semantic contradictions between conflicting documents (e.g., Doc A requires a wet-ink signature while Doc B accepts DocuSign).
- Identify critical missing steps and unassigned approval authorities.
- Compute topological dependencies or Critical Path Method (CPM) bottlenecks.
- Quantify timeline risk or simulate counterfactual "What-If" scenarios.

---

## 2. The Solution: Epistemic Engine
Epistemic Engine acts as a **process compiler**. It ingests multi-document packets, extracts schema-validated obligations with exact page-level citations, builds an evidentiary DAG, calculates probabilistic deadline-miss risk, and provides backward-chaining conditions answering:
**"What would have to be true for this process to succeed on time?"**

---

## 3. Key Differentiators

| Feature | Conventional RAG / Document AI | Epistemic Engine |
|---|---|---|
| **Structure** | Unstructured text chunks | Validated Typed DAG with `NodeState` |
| **Traceability** | Fuzzy search similarity | Exact page number, document, & verbatim snippet |
| **Contradictions** | Completely ignored / hallucinated | Deterministic cross-document conflict detection |
| **Unknowns** | Silent omission | Explicit identification of missing approvers & dates |
| **Risk Modeling** | None | 5,000-trial Monte Carlo PERT timeline simulation |
| **Decision Support** | Question-answering | Backward chaining & Immutable Counterfactuals |
| **Integrity Audit** | None | Automated Adversarial Validation Engine |

---

## 4. System Architecture

```text
[Multi-Document Ingestion] (PDF.js / Plaintext with Page Provenance)
           │
           ▼
[Semantic Extraction Layer] ──► AWS Bedrock (Claude 3.5 Sonnet) OR Deterministic Fallback
           │
           ▼
[Canonical Schema Validation] ──► Structured Claims with Verbatim Evidence
           │
           ├────────────────────────┬─────────────────────────┐
           ▼                        ▼                         ▼
[Process Graph DAG]       [Contradiction Engine]     [Unknowns Engine]
 Topological Sorting      Cross-Doc Conflicts        Missing Prerequisites
           │
           ├────────────────────────┬─────────────────────────┐
           ▼                        ▼                         ▼
[Critical Path Method]    [Monte Carlo Simulator]   [Backward Chaining]
 ES/EF/LS/LF Schedules    5,000 PERT Iterations     "What Would Have to Be True?"
           │
           ├────────────────────────┴─────────────────────────┐
           ▼                                                  ▼
[Counterfactual Playground]                       [Adversarial Validation Engine]
 Immutable Scenario Modeling                       Graph Vulnerability Stress Testing
           │
           ▼
[Next.js 15 Command Center] ──► React Flow Canvas + Provenance Drawer + Resolution Modal
```

---

## 5. AI & Reasoning Architecture

1. **Structured Semantic Extractor**:
   - **Bedrock Provider**: Calls Anthropic Claude models via Amazon Bedrock using JSON schema enforcement.
   - **Deterministic Fallback**: If AWS credentials or network access are unavailable, the engine automatically uses the high-precision deterministic extractor, guaranteeing 100% offline demo reliability.
2. **Critical Path Method (CPM)**:
   - Computes topological Early Start, Early Finish, Late Start, Late Finish, and Total Float across task dependencies.
3. **Monte Carlo PERT Timeline Simulator**:
   - Executes 5,000 stochastic trials using triangular PERT distributions ($a = \text{minDays}$, $m = \text{likelyDays}$, $b = \text{maxDays}$) to compute empirical deadline-miss risk.
   - *Language Standard*: All outputs are labeled **"Estimated under modeled assumptions"**.
4. **"What Would Have to Be True?" Backward Chaining**:
   - Traverses prerequisites backward from the target goal and classifies conditions into `SATISFIED`, `UNCERTAIN`, `BLOCKED`, and `CONTRADICTED`.
5. **Adversarial Validation Engine**:
   - Stress-tests the graph for `UNSUPPORTED_EDGE`, `UNRESOLVED_CONTRADICTION`, `UNSUPPORTED_ASSUMPTION`, and `BLOCKING_UNKNOWN` without mutating canonical graph state.

---

## 6. Monorepo Structure

```text
epistemic-engine/
├── apps/
│   ├── api/                     # Node.js Express REST backend
│   │   ├── src/
│   │   │   ├── engine/          # Extraction, CPM, Monte Carlo, Adversary, Contradiction
│   │   │   ├── routes/          # REST endpoints (/projects, /simulate, /adversary)
│   │   │   └── tests/           # 32 automated unit & integration tests
│   └── web/                     # Next.js 15 Command Center UI
│       ├── app/                 # App Router (Dashboard, Project Detail)
│       ├── components/          # React Flow DAG, Provenance Drawer, Resolution Modal
│       └── lib/api/             # Typed API Client
├── packages/
│   └── shared/                  # Canonical domain types and schemas
├── demo-data/                   # Deterministic 5-document demo dataset
└── docs/                        # Complete architecture & demo guides
```

---

## 7. Quick Start Guide

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### 2. Installation & Build
```bash
npm install
npm run typecheck
npm run test
npm run build
```

### 3. Running Locally
Start both backend (port 3001) and frontend (port 3000):
```bash
npm run dev
```

Visit `http://localhost:3000` to open the Command Center.

---

## 8. Demo Golden Path (Step-by-Step)

1. Open `http://localhost:3000` and create a project (e.g., **"Fall 2026 Internship Onboarding"**).
2. Upload the 5 sample documents from `demo-data/`:
   - `01-offer-letter.txt`
   - `02-university-guidelines.txt`
   - `03-internship-checklist.txt`
   - `04-faculty-email.txt`
   - `05-verification-policy.txt`
3. Click **⚡ Run Process Analysis**.
4. Observe the **Estimated Deadline Miss Risk** banner (5,000 Monte Carlo PERT trials).
5. Inspect the **Hero "What Would Have to Be True?"** checklist for target start date feasibility.
6. Open the **Interactive Graph Canvas** & observe the Critical Path highlighted in red.
7. Click any node or edge to open the **Provenance Drawer** and view verbatim source citations.
8. Switch to **Contradictions** &rarr; Open the **Contradiction Resolution Modal** &rarr; Select and resolve a conflicting signature policy.
9. Open the **Counterfactual Playground** &rarr; Simulate an expedited advisor review (-2 days) &rarr; Observe the risk reduction delta.
10. Open the **Adversarial Validation Engine** tab &rarr; Inspect vulnerability challenges and remediation advice.

---

## 9. Performance & Offline Reliability

> **Performance Note**: The deterministic reasoning, graph synthesis, and Monte Carlo simulation layers are lightweight and execute in milliseconds; external AI/network latency is isolated to the extraction provider.

- **Offline Mode / Demo Backup**: The system functions completely without internet or AWS credentials. If Bedrock credentials are not configured, deterministic fallback operates seamlessly with zero degradation to graph construction, CPM, risk simulation, counterfactuals, or UI features.

---

## 10. Known Limitations & Future Scope

- **OCR for Scanned PDFs**: Current ingestion parses native digital text and PDFs; future versions will integrate AWS Textract for scanned handwritten documents.
- **Cloud Persistence**: Production deployment supports direct S3/DynamoDB adapters beyond local memory storage.
