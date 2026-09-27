import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { parseDocumentBuffer } from "../engine/pdfParser.js";
import { extractClaimsFromDocument } from "../engine/extractor.js";
import { buildProcessGraph } from "../engine/graphBuilder.js";
import { detectContradictions } from "../engine/contradictionEngine.js";
import { generateUnknowns } from "../engine/unknownEngine.js";
import { calculateCriticalPath, assignNodeDurations } from "../engine/criticalPathEngine.js";
import { runMonteCarloSimulation } from "../engine/monteCarloSimulator.js";
import { evaluateWhatWouldHaveToBeTrue } from "../engine/backwardChainingEngine.js";
import { evaluateCounterfactualScenario } from "../engine/counterfactualEngine.js";
import { runAdversaryAudit } from "../engine/adversaryAgent.js";
import { ProcessGraph, StructuredClaim, Evidence } from "@epistemic/shared";

test("Golden Demo Dataset - End-to-End Pipeline & Sanity Verification", async (t) => {
  const demoDir = path.resolve(process.cwd(), "../../demo-data");
  assert.ok(fs.existsSync(demoDir), "demo-data directory must exist");

  const files = [
    "01-offer-letter.txt",
    "02-university-guidelines.txt",
    "03-internship-checklist.txt",
    "04-faculty-email.txt",
    "05-verification-policy.txt",
  ];

  const allClaims: StructuredClaim[] = [];
  const allEvidence: Evidence[] = [];
  const parsedDocs = [];

  for (const file of files) {
    const filePath = path.join(demoDir, file);
    const buffer = fs.readFileSync(filePath);
    const parsed = await parseDocumentBuffer(`doc_${file}`, file, buffer, "text/plain");
    assert.ok(parsed.pages.length > 0, `Parsed pages must exist for ${file}`);
    parsedDocs.push(parsed);

    const extraction = extractClaimsFromDocument(parsed);
    assert.ok(extraction.claims.length > 0, `Claims must be extracted from ${file}`);
    allClaims.push(...extraction.claims);
    allEvidence.push(...extraction.evidence);
  }

  // Deduplicate
  const uniqueClaims: StructuredClaim[] = [];
  const seen = new Set<string>();
  for (const c of allClaims) {
    const key = `${c.subject}::${c.predicate}::${c.object}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueClaims.push(c);
    }
  }

  const projectId = "proj_demo_gold";

  // 1. Graph Construction
  const graph = buildProcessGraph(projectId, uniqueClaims, allEvidence);
  assert.ok(graph.nodes.length >= 4, "Graph must contain multiple process nodes");
  assert.ok(graph.edges.length >= 2, "Graph must contain dependency edges");

  // 2. Contradiction Detection (Target: 2-3 contradictions)
  const contradictions = detectContradictions(projectId, uniqueClaims, allEvidence);
  assert.ok(
    contradictions.length >= 2,
    `Expected at least 2 contradictions, found: ${contradictions.length}`
  );

  // 3. Unknowns Detection (Target: 2-3 unknowns)
  const unknowns = generateUnknowns(projectId, uniqueClaims, graph);
  assert.ok(
    unknowns.length >= 2,
    `Expected at least 2 unknowns, found: ${unknowns.length}`
  );

  // 4. Critical Path Method
  const cpm = calculateCriticalPath(graph);
  assert.ok(cpm.totalExpectedDays > 0, "CPM total duration must be positive");
  assert.ok(cpm.criticalPath.length > 0, "Critical path nodes must be identified");

  // 5. Monte Carlo Simulation Sanity (0 <= prob <= 1, probSuccess + probMiss == 1)
  const targetDeadline = "2026-10-31";
  const sim = runMonteCarloSimulation(projectId, graph, targetDeadline, 5000);
  assert.ok(sim.iterations === 5000, "Simulation must run 5,000 iterations");
  assert.ok(
    sim.probabilityOfSuccess >= 0 && sim.probabilityOfSuccess <= 1,
    "Probability of success must be between 0 and 1"
  );
  assert.ok(
    sim.probabilityOfDeadlineMiss >= 0 && sim.probabilityOfDeadlineMiss <= 1,
    "Probability of deadline miss must be between 0 and 1"
  );
  assert.ok(
    Math.abs(sim.probabilityOfSuccess + sim.probabilityOfDeadlineMiss - 1) < 1e-4,
    "Probability of success + miss must equal 1.0"
  );

  // 6. 'What Would Have to Be True?' Backward Chaining
  const whatIf = evaluateWhatWouldHaveToBeTrue(projectId, graph, contradictions, unknowns, targetDeadline);
  assert.ok(whatIf.conditions.length > 0, "Conditions checklist must be generated");
  assert.ok(
    whatIf.conditions.some((c) => c.status === "CONTRADICTED"),
    "Must flag contradicted conditions"
  );

  // 7. Counterfactual Reasoning Sanity (+2 days delay vs -2 days acceleration)
  const criticalNode = cpm.criticalPath[0].nodeId;
  const delayScenario = evaluateCounterfactualScenario(
    projectId,
    graph,
    [
      {
        nodeId: criticalNode,
        durationDeltaDays: 2,
      },
    ],
    targetDeadline,
    5000
  );

  const accelScenario = evaluateCounterfactualScenario(
    projectId,
    graph,
    [
      {
        nodeId: criticalNode,
        durationDeltaDays: -2,
      },
    ],
    targetDeadline,
    5000
  );

  assert.notStrictEqual(
    delayScenario.deltaCompletionDays,
    accelScenario.deltaCompletionDays,
    "Different counterfactual modifications must yield different delta days"
  );

  // 8. Adversary Validation Engine
  const { assumptions } = assignNodeDurations(graph);
  const adversaryReport = runAdversaryAudit(
    projectId,
    graph,
    contradictions,
    unknowns,
    cpm.criticalPath,
    assumptions
  );
  assert.ok(adversaryReport.findings.length > 0, "Adversary must identify audit findings");
  assert.ok(adversaryReport.totalFindings > 0, "Adversary totalFindings must be positive");
  assert.ok(
    adversaryReport.findings.every(
      (f) => f.findingType && f.severity && f.targetId && f.reason && f.suggestedChallenge
    ),
    "Every adversary finding must contain type, severity, targetId, reason, and suggestedChallenge"
  );
});

