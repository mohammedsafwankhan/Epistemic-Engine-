# Epistemic Engine — Known Limitations & Bug Tracker

## 1. Resolved Bugs & Hardening Fixes
- **BUG-001 (Resolved in Phase 4)**: Resolved contradiction status string mismatch (`DETECTED` vs `UNRESOLVED`). Standardized to canonical lifecycle `UNRESOLVED` -> `RESOLVED` / `DISPUTED`.
- **BUG-002 (Resolved in Phase 4)**: Fixed optional evidence array passing in `buildProcessGraph` and `detectContradictions` to ensure backwards compatibility when evidence lists are omitted.
- **BUG-003 (Resolved in Phase 5)**: Standardized probability phrasing to prevent misleading claims about empirical certainty.
- **BUG-004 (Resolved in Phase 5)**: Aligned adversarial component naming to `Adversarial Validation Engine` to accurately reflect rule-based structural audits.

---

## 2. Known Limitations & Architecture Boundaries

### 1. AWS Bedrock Runtime Dependency
- **Behavior**: Real LLM extraction requires valid AWS IAM credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).
- **Mitigation**: The engine provides transparent, deterministic fallback extraction with 100% test coverage.

### 2. File Format Scope
- **Current Support**: Multi-page PDF documents and UTF-8 plain text files (`.txt`, `.md`).
- **Future Scope**: Scanned image-only PDFs requiring OCR (Textract), Word documents (`.docx`), and email threads (`.eml`).

### 3. Graph Layout
- **Current Support**: Hierarchical left-to-right DAG layout with interactive zoom, pan, and minimap powered by React Flow.
- **Future Scope**: Dynamic physics-based force simulation for ultra-large graphs (1,000+ nodes).

### 4. Storage Mode
- **Current Support**: Production-grade in-memory storage with filesystem caching and deterministic re-hydration.
- **Future Scope**: Direct AWS DynamoDB and S3 cloud connectors for multi-tenant multi-region deployments.
