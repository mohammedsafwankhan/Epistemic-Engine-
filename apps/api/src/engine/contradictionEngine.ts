import {
  Contradiction,
  StructuredClaim,
  Evidence,
  ContradictionType,
} from "@epistemic/shared";
import crypto from "crypto";

function normalizeDateString(dateStr: string): string {
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split("T")[0];
  }
  return dateStr.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function detectContradictions(
  projectId: string,
  claims: StructuredClaim[],
  evidenceList: Evidence[] = []
): Contradiction[] {
  const contradictions: Contradiction[] = [];

  const getEvidence = (claim: StructuredClaim): Evidence => {
    return (
      evidenceList.find(
        (e) => e.documentId === claim.documentId && e.pageNumber === claim.page
      ) || {
        id: `ev_${claim.id}`,
        documentId: claim.documentId,
        documentName: claim.documentName,
        snippet: claim.rawSnippet,
        pageNumber: claim.page,
        confidence: claim.confidence,
        extractedAt: new Date().toISOString(),
      }
    );
  };

  // 1. Deadline Conflict Detection
  const deadlineClaims = claims.filter((c) => c.claimType === "DEADLINE");
  for (let i = 0; i < deadlineClaims.length; i++) {
    for (let j = i + 1; j < deadlineClaims.length; j++) {
      const a = deadlineClaims[i];
      const b = deadlineClaims[j];

      if (a.subject.toLowerCase() === b.subject.toLowerCase()) {
        const normA = normalizeDateString(a.object);
        const normB = normalizeDateString(b.object);

        if (normA !== normB) {
          const evA = getEvidence(a);
          const evB = getEvidence(b);

          contradictions.push({
            id: `contra_${crypto.randomUUID()}`,
            projectId,
            type: "DEADLINE_CONFLICT",
            title: `Conflicting Deadlines for ${a.subject}`,
            description: `For '${a.subject}', document '${a.documentName || a.documentId}' specifies deadline '${a.object}' (Page ${a.page}), whereas document '${b.documentName || b.documentId}' specifies '${b.object}' (Page ${b.page}).`,
            claimA: `${a.subject} deadline: ${a.object}`,
            claimB: `${b.subject} deadline: ${b.object}`,
            evidenceA: evA,
            evidenceB: evB,
            conflictingNodeIds: [a.id, b.id],
            conflictingEvidenceIds: [evA.id, evB.id],
            severity: "HIGH",
            status: "UNRESOLVED",
          });
        }
      }
    }
  }

  // 2. Conflicting Signature / Verification Requirement Detection
  const signatureClaims = claims.filter(
    (c) =>
      c.claimType === "VERIFICATION" &&
      c.subject.toLowerCase().includes("signature")
  );
  for (let i = 0; i < signatureClaims.length; i++) {
    for (let j = i + 1; j < signatureClaims.length; j++) {
      const a = signatureClaims[i];
      const b = signatureClaims[j];

      const formatA = a.metadata?.format || a.object;
      const formatB = b.metadata?.format || b.object;

      if (
        (formatA === "physical" && formatB === "digital") ||
        (formatA === "digital" && formatB === "physical")
      ) {
        const evA = getEvidence(a);
        const evB = getEvidence(b);

        contradictions.push({
          id: `contra_${crypto.randomUUID()}`,
          projectId,
          type: "CONFLICTING_REQUIREMENT",
          title: "Conflicting Signature Format Policy",
          description: `Document '${a.documentName || a.documentId}' specifies '${a.object}', whereas document '${b.documentName || b.documentId}' specifies '${b.object}'.`,
          claimA: a.object,
          claimB: b.object,
          evidenceA: evA,
          evidenceB: evB,
          conflictingNodeIds: [a.id, b.id],
          conflictingEvidenceIds: [evA.id, evB.id],
          severity: "CRITICAL",
          status: "DETECTED",
        });
      }
    }
  }

  // 3. Conflicting Threshold Detection (e.g. GPA requirements)
  const thresholdClaims = claims.filter(
    (c) => c.predicate === "has_minimum_threshold"
  );
  for (let i = 0; i < thresholdClaims.length; i++) {
    for (let j = i + 1; j < thresholdClaims.length; j++) {
      const a = thresholdClaims[i];
      const b = thresholdClaims[j];

      if (
        a.subject.toLowerCase() === b.subject.toLowerCase() &&
        a.object.toLowerCase() !== b.object.toLowerCase()
      ) {
        const evA = getEvidence(a);
        const evB = getEvidence(b);

        contradictions.push({
          id: `contra_${crypto.randomUUID()}`,
          projectId,
          type: "CONFLICTING_THRESHOLD",
          title: `Conflicting Requirement for ${a.subject}`,
          description: `One policy requires '${a.object}', while another specifies '${b.object}'.`,
          claimA: `${a.subject}: ${a.object}`,
          claimB: `${b.subject}: ${b.object}`,
          evidenceA: evA,
          evidenceB: evB,
          conflictingNodeIds: [a.id, b.id],
          conflictingEvidenceIds: [evA.id, evB.id],
          severity: "MEDIUM",
          status: "DETECTED",
        });
      }
    }
  }

  // 4. Conflicting Issuer / Authorization Authority Detection
  const approvalClaims = claims.filter((c) => c.claimType === "APPROVAL");
  for (let i = 0; i < approvalClaims.length; i++) {
    for (let j = i + 1; j < approvalClaims.length; j++) {
      const a = approvalClaims[i];
      const b = approvalClaims[j];

      const isSameDomain =
        (a.rawSnippet.includes("cpt") && b.rawSnippet.includes("cpt")) ||
        (a.rawSnippet.includes("offer") && b.rawSnippet.includes("offer"));

      if (isSameDomain && a.subject.toLowerCase() !== b.subject.toLowerCase()) {
        const evA = getEvidence(a);
        const evB = getEvidence(b);

        contradictions.push({
          id: `contra_${crypto.randomUUID()}`,
          projectId,
          type: "CONFLICTING_ISSUER",
          title: "Conflicting Approval Authority",
          description: `Authorizing party is declared as '${a.subject}' in '${a.documentName || a.documentId}', but as '${b.subject}' in '${b.documentName || b.documentId}'.`,
          claimA: `Approver: ${a.subject}`,
          claimB: `Approver: ${b.subject}`,
          evidenceA: evA,
          evidenceB: evB,
          conflictingNodeIds: [a.id, b.id],
          conflictingEvidenceIds: [evA.id, evB.id],
          severity: "HIGH",
          status: "DETECTED",
        });
      }
    }
  }

  return contradictions;
}

