import {
  ProcessGraph,
  Contradiction,
  Unknown,
  DurationAssumption,
  CriticalPathItem,
  AdversaryFinding,
  AdversaryAuditReport,
} from "@epistemic/shared";
import crypto from "crypto";

export function runAdversaryAudit(
  projectId: string,
  graph: ProcessGraph,
  contradictions: Contradiction[],
  unknowns: Unknown[],
  criticalPath: CriticalPathItem[],
  assumptions: DurationAssumption[]
): AdversaryAuditReport {
  const findings: AdversaryFinding[] = [];

  // 1. Attack: Check for Unsupported Edges (Edges lacking source evidence)
  for (const edge of graph.edges) {
    if (!edge.evidenceIds || edge.evidenceIds.length === 0) {
      findings.push({
        id: `adv_${crypto.randomUUID()}`,
        findingType: "UNSUPPORTED_EDGE",
        severity: "HIGH",
        targetId: edge.id,
        targetLabel: `${edge.source} -> ${edge.target} (${edge.type})`,
        reason: `Relationship edge '${edge.type}' between '${edge.source}' and '${edge.target}' has no verbatim evidence citations in source documents.`,
        suggestedChallenge: "Verify whether this dependency was inferred heuristically rather than stated in official onboarding policy.",
      });
    }
  }

  // 2. Attack: Check for Unresolved Contradictions affecting the Process
  const unresolvedContradictions = contradictions.filter(
    (c) => c.status !== "RESOLVED"
  );
  for (const contra of unresolvedContradictions) {
    const isCriticalPathImplicated = criticalPath.some((cp) =>
      contra.conflictingNodeIds.some(
        (id) => cp.nodeId === id || cp.label.toLowerCase().includes(id.toLowerCase())
      )
    );

    findings.push({
      id: `adv_${crypto.randomUUID()}`,
      findingType: "UNRESOLVED_CONTRADICTION",
      severity: isCriticalPathImplicated ? "CRITICAL" : "HIGH",
      targetId: contra.id,
      targetLabel: contra.title,
      reason: `Active contradiction '${contra.title}' (${contra.type}) remains unresolved. ${
        isCriticalPathImplicated
          ? "CRITICAL: This conflict directly impacts a critical-path milestone."
          : "Discrepant requirements between documents could cause administrative rejection."
      }`,
      suggestedChallenge: `Formally accept one authoritative document policy in the Contradiction Resolution Center.`,
      evidence: [contra.evidenceA, contra.evidenceB],
    });
  }

  // 3. Attack: Check for Demo Assumptions masquerading in timeline risk
  for (const assumption of assumptions) {
    if (assumption.source === "DEMO_ASSUMPTION") {
      findings.push({
        id: `adv_${crypto.randomUUID()}`,
        findingType: "UNSUPPORTED_ASSUMPTION",
        severity: "MEDIUM",
        targetId: `assump_${assumption.task}`,
        targetLabel: `${assumption.task} (${assumption.minDays}-${assumption.maxDays} days)`,
        reason: `Duration for '${assumption.task}' relies on a demo assumption prior rather than extracted document evidence or user input.`,
        suggestedChallenge: "Validate actual department turnaround times with institutional coordinator before relying on timeline simulation.",
      });
    }
  }

  // 4. Attack: Check for Blocking Unknowns on Critical Path
  const blockingUnknowns = unknowns.filter((u) => u.blocking);
  for (const unk of blockingUnknowns) {
    findings.push({
      id: `adv_${crypto.randomUUID()}`,
      findingType: "BLOCKING_UNKNOWN",
      severity: "CRITICAL",
      targetId: unk.id,
      targetLabel: unk.question,
      reason: `Critical process unknown is unresolved: "${unk.question}". Process cannot guarantee on-time completion.`,
      suggestedChallenge: unk.suggestedAction || "Request explicit written clarification from program administrator.",
    });
  }

  const criticalFindings = findings.filter((f) => f.severity === "CRITICAL").length;
  const highFindings = findings.filter((f) => f.severity === "HIGH").length;
  const mediumFindings = findings.filter((f) => f.severity === "MEDIUM").length;

  return {
    projectId,
    totalFindings: findings.length,
    criticalFindings,
    highFindings,
    mediumFindings,
    findings,
    auditedAt: new Date().toISOString(),
  };
}

