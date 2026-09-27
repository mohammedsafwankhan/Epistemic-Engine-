import { Unknown, StructuredClaim, ProcessGraph } from "@epistemic/shared";
import crypto from "crypto";

export function generateUnknowns(
  projectId: string,
  claims: StructuredClaim[],
  graph: ProcessGraph
): Unknown[] {
  const unknowns: Unknown[] = [];

  // Identify core obligations
  const obligations = claims.filter(
    (c) =>
      c.claimType === "REQUIREMENT" ||
      c.claimType === "DOCUMENT_REQUIREMENT" ||
      c.claimType === "DEADLINE"
  );

  const distinctSubjects = Array.from(new Set(claims.map((c) => c.subject)));

  // 1. Missing Deadline Check for Critical Obligations
  for (const subject of distinctSubjects) {
    const hasDeadline = claims.some(
      (c) => c.claimType === "DEADLINE" && c.subject.toLowerCase() === subject.toLowerCase()
    );

    if (!hasDeadline) {
      const subjectNodes = graph.nodes
        .filter((n) => n.label.toLowerCase() === subject.toLowerCase())
        .map((n) => n.id);

      unknowns.push({
        id: `unk_${crypto.randomUUID()}`,
        projectId,
        question: `What is the explicit deadline for completing '${subject}'?`,
        impactScore: 8.5,
        severity: "HIGH",
        blocking: true,
        status: "OPEN",
        affectingNodeIds: subjectNodes,
        suggestedAction: `Request written confirmation of submission cut-off date for ${subject}.`,
        resolved: false,
      });
    }
  }

  // 2. Missing Verifier / Approval Authority Check
  const requiresApprovalSubjects = distinctSubjects.filter(
    (s) => /cpt|opt|visa|offer|transcript|exception/i.test(s)
  );

  for (const subject of requiresApprovalSubjects) {
    const hasApproval = claims.some(
      (c) => c.claimType === "APPROVAL" && c.rawSnippet.toLowerCase().includes(subject.toLowerCase())
    );

    if (!hasApproval) {
      const subjectNodes = graph.nodes
        .filter((n) => n.label.toLowerCase().includes(subject.toLowerCase()))
        .map((n) => n.id);

      unknowns.push({
        id: `unk_${crypto.randomUUID()}`,
        projectId,
        question: `Who is the designated authorization authority responsible for approving '${subject}'?`,
        impactScore: 9.0,
        severity: "CRITICAL",
        blocking: true,
        status: "OPEN",
        affectingNodeIds: subjectNodes,
        suggestedAction: `Contact university department to identify if faculty advisor or DSO signature is required.`,
        resolved: false,
      });
    }
  }

  // 3. Missing Proof / Evidence Verification Method Check
  const docReqs = claims.filter((c) => c.claimType === "DOCUMENT_REQUIREMENT");
  for (const docReq of docReqs) {
    const hasVerification = claims.some(
      (c) =>
        c.claimType === "VERIFICATION" &&
        c.rawSnippet.toLowerCase().includes(docReq.object.toLowerCase())
    );

    if (!hasVerification) {
      unknowns.push({
        id: `unk_${crypto.randomUUID()}`,
        projectId,
        question: `What official evidence or verification format proves compliance for '${docReq.object}'?`,
        impactScore: 7.0,
        severity: "MEDIUM",
        blocking: false,
        status: "OPEN",
        affectingNodeIds: [docReq.id],
        suggestedAction: `Confirm acceptable document formats (PDF, scanned certified copy, or electronic portal).`,
        resolved: false,
      });
    }
  }

  // 4. Missing Alternative / Contingency Plan Check for Visa/CPT
  const hasVisaOrCPT = claims.some((c) => /cpt|opt|visa/i.test(c.rawSnippet));
  if (hasVisaOrCPT) {
    const hasAlternative = claims.some(
      (c) => c.claimType === "EXCEPTION" || /expedite|defer|remote|contingency/i.test(c.rawSnippet)
    );

    if (!hasAlternative) {
      unknowns.push({
        id: `unk_${crypto.randomUUID()}`,
        projectId,
        question: `What contingency or start-date deferral options exist if CPT/work authorization is delayed?`,
        impactScore: 7.5,
        severity: "HIGH",
        blocking: false,
        status: "OPEN",
        affectingNodeIds: [],
        suggestedAction: `Check company policy regarding remote start or delayed start date contingencies.`,
        resolved: false,
      });
    }
  }

  return unknowns;
}

