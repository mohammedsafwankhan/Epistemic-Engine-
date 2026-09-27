import { StructuredClaim, Evidence, ClaimType } from "@epistemic/shared";
import { ParsedDocumentResult } from "./pdfParser.js";
import crypto from "crypto";

export interface ExtractionResult {
  claims: StructuredClaim[];
  evidence: Evidence[];
  rejectedClaims: Array<{ raw: unknown; reason: string }>;
}

/**
 * Validates a claim against strict structural requirements.
 * Rejects claims with missing fields, empty strings, invalid confidence, or missing page numbers.
 */
export function validateClaim(claim: unknown): { valid: boolean; reason?: string; validatedClaim?: StructuredClaim } {
  if (!claim || typeof claim !== "object") {
    return { valid: false, reason: "Claim is not an object" };
  }

  const c = claim as Record<string, unknown>;

  const validTypes: ClaimType[] = [
    "FACT",
    "REQUIREMENT",
    "DEADLINE",
    "ACTOR",
    "DOCUMENT_REQUIREMENT",
    "APPROVAL",
    "VERIFICATION",
    "EXCEPTION",
  ];

  if (!c.claimType || !validTypes.includes(c.claimType as ClaimType)) {
    return { valid: false, reason: `Invalid claimType: ${c.claimType}` };
  }

  if (!c.subject || typeof c.subject !== "string" || c.subject.trim() === "") {
    return { valid: false, reason: "Subject is required and cannot be empty" };
  }

  if (!c.predicate || typeof c.predicate !== "string" || c.predicate.trim() === "") {
    return { valid: false, reason: "Predicate is required and cannot be empty" };
  }

  if (!c.object || typeof c.object !== "string" || c.object.trim() === "") {
    return { valid: false, reason: "Object is required and cannot be empty" };
  }

  if (!c.documentId || typeof c.documentId !== "string") {
    return { valid: false, reason: "DocumentId is required" };
  }

  if (typeof c.page !== "number" || c.page < 1) {
    return { valid: false, reason: "Valid page number >= 1 is required" };
  }

  if (!c.rawSnippet || typeof c.rawSnippet !== "string" || c.rawSnippet.trim() === "") {
    return { valid: false, reason: "Raw evidence snippet is required" };
  }

  const confidence = typeof c.confidence === "number" ? c.confidence : 0.9;
  if (confidence < 0 || confidence > 1) {
    return { valid: false, reason: "Confidence must be between 0 and 1" };
  }

  const validated: StructuredClaim = {
    id: typeof c.id === "string" ? c.id : `claim_${crypto.randomUUID()}`,
    claimType: c.claimType as ClaimType,
    subject: c.subject.trim(),
    predicate: c.predicate.trim(),
    object: c.object.trim(),
    documentId: c.documentId,
    documentName: typeof c.documentName === "string" ? c.documentName : undefined,
    page: c.page,
    startOffset: typeof c.startOffset === "number" ? c.startOffset : undefined,
    endOffset: typeof c.endOffset === "number" ? c.endOffset : undefined,
    rawSnippet: c.rawSnippet.trim(),
    confidence,
    metadata: typeof c.metadata === "object" && c.metadata !== null ? (c.metadata as Record<string, unknown>) : {},
  };

  return { valid: true, validatedClaim: validated };
}

/**
 * Deterministic Semantic Extractor for Internship / University Onboarding documents.
 * Extracts key obligations, actors, deadlines, signatures, requirements, and evidence.
 */
export function extractClaimsFromDocument(parsedDoc: ParsedDocumentResult): ExtractionResult {
  const claims: StructuredClaim[] = [];
  const evidenceList: Evidence[] = [];
  const rejectedClaims: Array<{ raw: unknown; reason: string }> = [];

  for (const page of parsedDoc.pages) {
    const text = page.text;
    if (!text || text.trim() === "") continue;

    // Create page-level evidence record
    const pageEvidenceId = `ev_${crypto.randomUUID()}`;
    const pageEvidence: Evidence = {
      id: pageEvidenceId,
      documentId: parsedDoc.documentId,
      documentName: parsedDoc.fileName,
      snippet: text.length > 300 ? text.substring(0, 300) + "..." : text,
      pageNumber: page.pageNumber,
      confidence: 1.0,
      extractedAt: new Date().toISOString(),
    };
    evidenceList.push(pageEvidence);

    // Sentence/clause based structured pattern extraction
    const lines = text.split(/\r?\n|\. /);

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length < 5) continue;

      // 1. Deadline patterns (e.g., "Must submit by September 30, 2026", "Deadline: 2026-09-30", "due on Oct 1")
      const deadlineMatch = cleanLine.match(/(?:deadline|due|by|before|submit on|start date|effective date)[:\s]+([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (deadlineMatch) {
        const dateStr = deadlineMatch[1];
        let subject = "Process Obligation";
        if (/cpt|opt|visa/i.test(cleanLine)) subject = "CPT/OPT Authorization";
        else if (/offer|acceptance|sign/i.test(cleanLine)) subject = "Offer Acceptance";
        else if (/tax|w-4|i-9/i.test(cleanLine)) subject = "Tax Compliance";
        else if (/transcript|degree/i.test(cleanLine)) subject = "Official Transcript";
        else if (/background check|nda/i.test(cleanLine)) subject = "Background Check";

        const rawClaim = {
          claimType: "DEADLINE",
          subject,
          predicate: "has_deadline",
          object: dateStr,
          documentId: parsedDoc.documentId,
          documentName: parsedDoc.fileName,
          page: page.pageNumber,
          rawSnippet: cleanLine,
          confidence: 0.95,
          metadata: { extractedDate: dateStr },
        };

        const val = validateClaim(rawClaim);
        if (val.valid && val.validatedClaim) {
          claims.push(val.validatedClaim);
        } else {
          rejectedClaims.push({ raw: rawClaim, reason: val.reason || "Validation failed" });
        }
      }

      // 2. Requirement / Document Requirement patterns (e.g. "Requires physical signature", "Must provide W-4 form")
      const reqMatch = cleanLine.match(/(?:must|requires|required to|shall|mandatory to)\s+([^.]+)/i);
      if (reqMatch) {
        const reqText = reqMatch[1].trim();
        const isDocReq = /form|transcript|letter|id|passport|visa|resume|certificate/i.test(reqText);
        
        const rawClaim = {
          claimType: isDocReq ? "DOCUMENT_REQUIREMENT" : "REQUIREMENT",
          subject: reqText.split(" ")[0] || "Intern",
          predicate: "requires",
          object: reqText,
          documentId: parsedDoc.documentId,
          documentName: parsedDoc.fileName,
          page: page.pageNumber,
          rawSnippet: cleanLine,
          confidence: 0.9,
          metadata: { ruleType: isDocReq ? "document" : "obligation" },
        };

        const val = validateClaim(rawClaim);
        if (val.valid && val.validatedClaim) {
          claims.push(val.validatedClaim);
        } else {
          rejectedClaims.push({ raw: rawClaim, reason: val.reason || "Validation failed" });
        }
      }

      // 3. Approval / Verifier patterns (e.g., "Academic advisor must approve", "HR verifies background check")
      const approvalMatch = cleanLine.match(/(academic advisor|faculty advisor|department chair|hr manager|supervisor|immigration officer)\s+(?:must approve|verifies|authorizes|signs)/i);
      if (approvalMatch) {
        const actor = approvalMatch[1].trim();
        const rawClaim = {
          claimType: "APPROVAL",
          subject: actor,
          predicate: "authorizes",
          object: cleanLine,
          documentId: parsedDoc.documentId,
          documentName: parsedDoc.fileName,
          page: page.pageNumber,
          rawSnippet: cleanLine,
          confidence: 0.92,
          metadata: { actor },
        };

        const val = validateClaim(rawClaim);
        if (val.valid && val.validatedClaim) {
          claims.push(val.validatedClaim);
        } else {
          rejectedClaims.push({ raw: rawClaim, reason: val.reason || "Validation failed" });
        }
      }

      // 4. Threshold patterns (e.g. "Minimum GPA of 3.5", "Minimum GPA 3.0", "at least 20 hours per week")
      const thresholdMatch = cleanLine.match(/(?:minimum|at least|no less than)\s+([A-Za-z0-9\s.%]+)/i);
      if (thresholdMatch && /gpa|hours|credits|score/i.test(cleanLine)) {
        const threshold = thresholdMatch[1].trim();
        const rawClaim = {
          claimType: "REQUIREMENT",
          subject: /gpa/i.test(cleanLine) ? "GPA Threshold" : "Workload Threshold",
          predicate: "has_minimum_threshold",
          object: threshold,
          documentId: parsedDoc.documentId,
          documentName: parsedDoc.fileName,
          page: page.pageNumber,
          rawSnippet: cleanLine,
          confidence: 0.95,
          metadata: { threshold },
        };

        const val = validateClaim(rawClaim);
        if (val.valid && val.validatedClaim) {
          claims.push(val.validatedClaim);
        } else {
          rejectedClaims.push({ raw: rawClaim, reason: val.reason || "Validation failed" });
        }
      }

      // 5. Signature requirements (e.g. "Physical wet-ink signature required", "Digital electronic signatures accepted")
      if (/signature/i.test(cleanLine)) {
        const isDigital = /digital|electronic|docusign|adobe sign/i.test(cleanLine);
        const isPhysical = /physical|wet ink|hard copy|original/i.test(cleanLine);

        if (isDigital || isPhysical) {
          const rawClaim = {
            claimType: "VERIFICATION",
            subject: "Signature Method",
            predicate: "specifies_format",
            object: isPhysical ? "Physical wet-ink signature" : "Digital electronic signature",
            documentId: parsedDoc.documentId,
            documentName: parsedDoc.fileName,
            page: page.pageNumber,
            rawSnippet: cleanLine,
            confidence: 0.95,
            metadata: { format: isPhysical ? "physical" : "digital" },
          };

          const val = validateClaim(rawClaim);
          if (val.valid && val.validatedClaim) {
            claims.push(val.validatedClaim);
          } else {
            rejectedClaims.push({ raw: rawClaim, reason: val.reason || "Validation failed" });
          }
        }
      }
    }
  }

  // Deduplicate exact duplicate claims
  const uniqueClaims: StructuredClaim[] = [];
  const seen = new Set<string>();

  for (const claim of claims) {
    const key = `${claim.claimType}:${claim.subject}:${claim.predicate}:${claim.object}:${claim.page}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueClaims.push(claim);
    }
  }

  return {
    claims: uniqueClaims,
    evidence: evidenceList,
    rejectedClaims,
  };
}

