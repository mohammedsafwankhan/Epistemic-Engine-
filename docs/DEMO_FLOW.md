# Epistemic Engine — Demo Script & Presentation Guide

## 1. Core Positioning
> **Every real-world process is a distributed program whose rules are scattered across documents, emails, forms, and institutional knowledge.**
>
> **Epistemic Engine compiles that fragmented process into a structured model of evidence, dependencies, contradictions, unknowns, and risk.**
>
> **It doesn't just tell you what the documents say — it tells you what has to be true for the process to succeed.**

---

## 2. 30-Second Pitch (The Elevator Hook)
"Process failure costs organizations billions every year — students miss graduation requirements, international interns face visa delays, and enterprises stall onboarding. Traditional AI search and RAG summarize documents, but they cannot reason over hidden dependencies, missing deadlines, or conflicting policies across multiple PDFs. 

**Epistemic Engine** is Context Zero for real-world processes. It ingests messy documents, compiles an evidentiary process graph, mathematically detects contradictions and blocking unknowns, simulates timeline risk via Monte Carlo PERT modeling, and runs backward chaining to answer: *'What would have to be true for this process to succeed on time?'*"

---

## 3. 1-Minute Pitch (Why Conventional Document AI Fails)
"When organizations use conventional LLM search or Chat-with-PDF tools, they face three fatal flaws:
1. **Hallucination & Lack of Verifiable Traceability**: Generic chat tools give unstructured answers without strict page-level evidentiary provenance.
2. **Inability to Detect Contradictions Across Silos**: An offer letter might say 'Deadline Oct 15', while departmental guidelines say 'Deadline Oct 1'. Search only retrieves one at a time; it doesn't compute that they conflict.
3. **No Temporal or Probabilistic Reasoning**: RAG cannot answer: *'What is the likelihood we miss our start date?'* or *'What happens if advisor approval takes 2 extra days?'*

Epistemic Engine converts unstructured text into a validated DAG of obligations, applies topological Critical Path Method (CPM) and 5,000-trial Monte Carlo simulations, and allows users to run immutable counterfactual scenarios to eliminate risk before deadlines pass."

---

## 4. 3-Minute Golden Demo Path (Step-by-Step Script)

| Step | Action in UI | Voiceover / What to Explain | Key Visual |
|---|---|---|---|
| **1. Upload** | Open Project &rarr; Upload the 5 demo files from `demo-data/` | *"We upload 5 real onboarding documents: an Offer Letter, University Guidelines, Department Checklist, Advisor Email, and Compliance Policy."* | Multi-document upload cards |
| **2. Analyze** | Click **⚡ Run Process Analysis** | *"The engine extracts structured obligations with exact page-level provenance, using AWS Bedrock Claude or deterministic fallback."* | Loading pulse &rarr; Real-time analysis metrics |
| **3. Risk Banner** | View Hero Probability Banner | *"Immediately, the engine identifies an **Estimated Deadline Miss Risk of 68%** under modeled assumptions across 5,000 Monte Carlo PERT trials."* | High-risk amber/rose score banner |
| **4. Hero Moment** | Open **[ What Would Have to Be True? ]** | *"We ask the backward-chaining engine: 'What must be true to start by October 20?' It classifies requirements into SATISFIED, UNCERTAIN, BLOCKED, and CONTRADICTED."* | Prerequisite condition status checklist |
| **5. Graph Canvas** | Switch to **Interactive Canvas** tab | *"Here is the compiled process graph rendered in React Flow. Glowing red nodes highlight the Critical Path where tasks have zero float."* | Animated dependency edges, node states |
| **6. Provenance** | Click any node or edge &rarr; Opens Provenance Drawer | *"Clicking any element reveals the verbatim source text, document name, page number, and extraction confidence. Zero ungrounded hallucinations."* | Side-drawer with verbatim citation |
| **7. Contradiction** | Switch to **Contradictions** tab &rarr; Click **Resolve** | *"The engine flagged a direct conflict: Document A requires a 'Physical wet-ink signature' while Document B accepts 'Digital electronic signatures'. We open the side-by-side diff and accept Document B."* | Side-by-side evidence diff modal |
| **8. Counterfactual** | Switch to **Counterfactual Playground** | *"What if we expedite the faculty advisor review from 5 days to 2 days? We run the simulation: the deadline miss risk instantly drops from 68% down to 12%."* | Dynamic risk delta comparison |
| **9. Adversary Audit** | Switch to **Adversarial Validation Engine** | *"Our Adversarial Validation Engine stress-tests the graph for unsupported edges or missing authorization authorities, ensuring airtight compliance."* | Automated audit findings & remediation cards |

---

## 5. 5-Minute Technical Deep Dive (Architecture & Math)

```text
[Multi-Document Ingestion] (PDF.js / Plaintext Page-Level Chunking)
           │
           ▼
[Extraction Layer] (Bedrock Claude 3.5 Sonnet Provider + Deterministic Fallback)
           │
           ▼
[Canonical Schema Validation] (Structured Claims, Page Provenance, Confidence Scores)
           │
           ├────────────────────────┬─────────────────────────┐
           ▼                        ▼                         ▼
[Process Graph DAG]       [Contradiction Engine]     [Unknowns Engine]
 Topological Sorting      Policy & Deadline Conflicts Missing Deadlines/Approvers
           │
           ├────────────────────────┬─────────────────────────┐
           ▼                        ▼                         ▼
[Critical Path Method]    [Monte Carlo Engine]      [Backward Chainer]
 ES/EF/LS/LF Schedules    5,000 PERT Trials         Goal Prerequisite Trees
 Zero-Float Bottlenecks   Risk Distributions        "What Would Have to Be True?"
           │
           ▼
[Counterfactual Engine] ──► Immutable State Cloning ──► Delta Risk Calculation
           │
           ▼
[Adversarial Validation Engine] ──► Graph Stress Testing (Unsupported Edges / Gaps)
```

---

## 6. Judge Q&A Cheat Sheet

#### Q1: Why isn't this just RAG?
> **Answer**: RAG is stateless text retrieval — it retrieves top-k text chunks for a query. It cannot construct a topological dependency graph, calculate critical paths, detect semantic contradictions between two separate PDFs, run Monte Carlo PERT simulations, or compute backward-chaining prerequisite paths. Epistemic Engine is a process compiler, not a vector search engine.

#### Q2: Where is AI actually used?
> **Answer**: AI is utilized in the **Semantic Extraction Layer** via Amazon Bedrock (Claude models). It transforms unstructured natural language text from multi-page PDFs into strongly typed, schema-validated structured claims (Obligations, Deadlines, Verifications, Approvals) with page numbers and verbatim snippets.

#### Q3: How do you prevent hallucinations?
> **Answer**: Every single claim extracted by the LLM is validated against a strict runtime schema (`validateClaim`). Claims lacking verbatim citations, page numbers, or valid confidence scores are rejected. Furthermore, the **Adversarial Validation Engine** scans the entire graph and flags any relationship edge that lacks underlying document provenance (`UNSUPPORTED_EDGE`).

#### Q4: How are probabilities calculated?
> **Answer**: We use the classical project management **PERT/Triangular Distribution** ($a = \text{minDays}$, $m = \text{likelyDays}$, $b = \text{maxDays}$) combined with a 5,000-trial Monte Carlo simulation over the DAG. It calculates the empirical fraction of trials where the cumulative path duration exceeds the target deadline. All probabilities are transparently labeled as *"Estimated under modeled assumptions"*.

#### Q5: What happens if Bedrock or AWS is unavailable?
> **Answer**: Epistemic Engine features a resilient provider abstraction (`ClaimExtractor`). If AWS Bedrock credentials or network access are unavailable, the engine automatically and transparently falls back to the high-precision `DeterministicClaimExtractor`, enabling complete offline execution and rock-solid demo reliability.

#### Q6: Can this scale beyond internships?
> **Answer**: Absolutely. The core data structures (`ProcessGraph`, `NodeState`, `Contradiction`, `Unknown`, `CriticalPathItem`) are domain-agnostic. The engine can ingest mortgage applications, government grant compliance, pharmaceutical clinical trial onboarding, and vendor contract reviews without architectural modification.
