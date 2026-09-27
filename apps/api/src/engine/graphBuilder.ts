import {
  ProcessGraph,
  Node,
  Edge,
  Evidence,
  StructuredClaim,
  NodeType,
  EdgeType,
} from "@epistemic/shared";
import crypto from "crypto";

export function buildProcessGraph(
  projectId: string,
  claims: StructuredClaim[],
  evidenceList: Evidence[] = []
): ProcessGraph {
  const nodesMap = new Map<string, Node>();
  const edges: Edge[] = [];

  // Index evidence by document and page for fast linking
  const evidenceByDocPage = new Map<string, string>();
  for (const ev of evidenceList) {
    const key = `${ev.documentId}:${ev.pageNumber}`;
    evidenceByDocPage.set(key, ev.id);
  }

  // Create root Document nodes for referenced documents
  const docIds = new Set(claims.map((c) => c.documentId));
  for (const docId of docIds) {
    const docName = claims.find((c) => c.documentId === docId)?.documentName || "Document";
    const docNodeId = `node_doc_${docId}`;
    if (!nodesMap.has(docNodeId)) {
      nodesMap.set(docNodeId, {
        id: docNodeId,
        projectId,
        type: "DOCUMENT",
        label: docName,
        description: `Source document ${docName}`,
        confidence: 1.0,
        state: "VERIFIED",
        evidenceIds: evidenceList.filter((e) => e.documentId === docId).map((e) => e.id),
        properties: { documentId: docId, fileName: docName },
      });
    }
  }

  // Transform each structured claim into graph nodes and relational edges
  for (const claim of claims) {
    const evidenceKey = `${claim.documentId}:${claim.page}`;
    const evidenceId = evidenceByDocPage.get(evidenceKey) || evidenceList[0]?.id || "";
    const evidenceIds = evidenceId ? [evidenceId] : [];

    let nodeType: NodeType = "OBLIGATION";
    let edgeType: EdgeType = "requires";

    switch (claim.claimType) {
      case "DEADLINE":
        nodeType = "DEADLINE";
        edgeType = "precedes";
        break;
      case "APPROVAL":
        nodeType = "APPROVAL";
        edgeType = "authorizes";
        break;
      case "ACTOR":
        nodeType = "ACTOR";
        edgeType = "authorizes";
        break;
      case "VERIFICATION":
        nodeType = "VERIFICATION";
        edgeType = "verifies";
        break;
      case "DOCUMENT_REQUIREMENT":
        nodeType = "DOCUMENT";
        edgeType = "requires";
        break;
      case "REQUIREMENT":
      case "FACT":
      default:
        nodeType = "OBLIGATION";
        edgeType = "requires";
        break;
    }

    // Node for the claim subject/concept
    const subjectNodeId = `node_${crypto.createHash("md5").update(`${projectId}:${claim.subject}`).digest("hex").slice(0, 12)}`;
    if (!nodesMap.has(subjectNodeId)) {
      nodesMap.set(subjectNodeId, {
        id: subjectNodeId,
        projectId,
        type: "OBLIGATION",
        label: claim.subject,
        description: `Process entity: ${claim.subject}`,
        confidence: claim.confidence,
        state: "NOT_STARTED",
        evidenceIds: [...evidenceIds],
        properties: { subject: claim.subject },
      });
    } else {
      const existing = nodesMap.get(subjectNodeId)!;
      if (evidenceId && !existing.evidenceIds.includes(evidenceId)) {
        existing.evidenceIds.push(evidenceId);
      }
    }

    // Node for the claim target/object
    const objectNodeId = `node_${crypto.createHash("md5").update(`${projectId}:${claim.object}:${nodeType}`).digest("hex").slice(0, 12)}`;
    if (!nodesMap.has(objectNodeId)) {
      nodesMap.set(objectNodeId, {
        id: objectNodeId,
        projectId,
        type: nodeType,
        label: claim.object,
        description: `${claim.claimType}: ${claim.object}`,
        confidence: claim.confidence,
        state: "NOT_STARTED",
        evidenceIds: [...evidenceIds],
        properties: {
          claimType: claim.claimType,
          predicate: claim.predicate,
          ...claim.metadata,
        },
      });
    } else {
      const existing = nodesMap.get(objectNodeId)!;
      if (evidenceId && !existing.evidenceIds.includes(evidenceId)) {
        existing.evidenceIds.push(evidenceId);
      }
    }

    // Connect Subject -> Object
    const edgeId = `edge_${crypto.createHash("md5").update(`${subjectNodeId}:${objectNodeId}:${edgeType}`).digest("hex").slice(0, 12)}`;
    if (!edges.some((e) => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        projectId,
        source: subjectNodeId,
        target: objectNodeId,
        type: edgeType,
        confidence: claim.confidence,
        evidenceIds: [...evidenceIds],
        properties: { predicate: claim.predicate, claimId: claim.id },
      });
    }

    // Also link Document node -> Subject node
    const docNodeId = `node_doc_${claim.documentId}`;
    if (nodesMap.has(docNodeId)) {
      const docEdgeId = `edge_${crypto.createHash("md5").update(`${docNodeId}:${subjectNodeId}:authorizes`).digest("hex").slice(0, 12)}`;
      if (!edges.some((e) => e.id === docEdgeId)) {
        edges.push({
          id: docEdgeId,
          projectId,
          source: docNodeId,
          target: subjectNodeId,
          type: "authorizes",
          confidence: 1.0,
          evidenceIds: [...evidenceIds],
          properties: { relation: "defined_in_document" },
        });
      }
    }
  }

  return {
    projectId,
    nodes: Array.from(nodesMap.values()),
    edges,
    evidence: evidenceList,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}
