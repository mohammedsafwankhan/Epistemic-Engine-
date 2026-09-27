# Epistemic Engine - Architectural Decisions (ADRs)

## ADR 001: Monorepo Structure & Package Management
- **Date**: 2026-09-19
- **Decision**: Standard npm workspaces (`apps/web`, `apps/api`, `packages/shared`).
- **Rationale**: Keeps full TypeScript type safety across frontend and backend without duplicating models or requiring complex monorepo orchestration tools.

## ADR 002: Technology Stack Selection
- **Frontend**: Next.js 15 (App Router) + React 19 + Tailwind CSS.
- **Backend**: Node.js + Express + TypeScript with ESM modules.
- **Storage**: S3 boundary adapter for source documents, with Memory/Local adapter for immediate zero-config local development.
- **State/Database**: DynamoDB repository boundary with Memory/Local repository for local development and rapid test runs.
- **AI Integration**: Amazon Bedrock boundary established for Phase 2 integration.

## ADR 003: Storage & Database Abstractions
- **Decision**: Define `DocumentStorage` interface and `ProjectRepository` interface.
- **Rationale**: Allows instant running and automated test verification without requiring live AWS credentials during local development, while maintaining drop-in compatibility for live S3 and DynamoDB instances in AWS environments.

## ADR 004: Centralized Error Envelopes
- **Decision**: Standard error shape: `{ error: { code: "VALIDATION_ERROR", message: "..." } }`.
- **Rationale**: Prevents accidental leakage of backend stack traces or internal secrets to clients while giving frontend components consistent error code discrimination.

