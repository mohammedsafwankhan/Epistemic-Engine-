import {
  ProcessGraph,
  Contradiction,
  Unknown,
  ProcessCondition,
  ProcessConditionStatus,
  WhatWouldHaveToBeTrueResult,
} from "@epistemic/shared";
import { calculateCriticalPath } from "./criticalPathEngine.js";
import crypto from "crypto";

export function evaluateWhatWouldHaveToBeTrue(
  projectId: string,
  graph: ProcessGraph,
  contradictions: Contradiction[],
  unknowns: Unknown[],
  targetDateStr?: string
): WhatWouldHaveToBeTrueResult {
  const cpm = calculateCriticalPath(graph);
  const conditions: ProcessCondition[] = [];

  const now = new Date();
  const targetDate = targetDateStr || new Date(now.getTime() + (cpm.totalExpectedDays + 1) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const targetDays = Math.max(
    1,
    Math.ceil((new Date(targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Map contradictions to node labels/ids
  const contradictedLabels = new Set<string>();
  for (const contra of contradictions) {
    contra.conflictingNodeIds.forEach((id) => contradictedLabels.add(id));
    if (contra.title.includes("for ")) {
      contradictedLabels.add(contra.title.split("for ")[1].toLowerCase());
    }
  }

  // Map unknowns to node labels/ids
  const unknownSubjects = new Set<string>();
  for (const unk of unknowns) {
    unk.affectingNodeIds.forEach((id) => unknownSubjects.add(id));
    unknownSubjects.add(unk.question.toLowerCase());
  }

  // Evaluate conditions across schedule
  for (const item of cpm.schedule) {
    const labelLower = item.label.toLowerCase();

    let status: ProcessConditionStatus = "SATISFIED";
    let impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = item.isCritical ? "HIGH" : "MEDIUM";
    let description = `${item.label} completed on schedule`;
    let suggestedAction: string | undefined = undefined;

    // 1. Check if implicated in Contradiction
    const isContradicted =
      contradictedLabels.has(item.nodeId) ||
      Array.from(contradictedLabels).some((c) => labelLower.includes(c) || c.includes(labelLower));

    // 2. Check if implicated in Unknown
    const isUncertain =
      unknownSubjects.has(item.nodeId) ||
      Array.from(unknownSubjects).some((u) => u.includes(labelLower));

    // 3. Check if schedule duration exceeds target window
    const isScheduleBlocked = item.earlyFinish > targetDays;

    if (isContradicted) {
      status = "CONTRADICTED";
      impact = "CRITICAL";
      description = `Conflicting policies or deadline dates for '${item.label}' must be formally reconciled`;
      suggestedAction = `Obtain single authoritative clarification to resolve document contradictions for ${item.label}.`;
    } else if (isScheduleBlocked) {
      status = "BLOCKED";
      impact = "CRITICAL";
      description = `'${item.label}' critical path timeline (${item.earlyFinish} days) exceeds target window (${targetDays} days)`;
      suggestedAction = `Expedite process duration or request start-date extension by ${item.earlyFinish - targetDays} days.`;
    } else if (isUncertain) {
      status = "UNCERTAIN";
      impact = "HIGH";
      description = `Missing authorization, explicit deadline, or verification proof for '${item.label}'`;
      suggestedAction = `Obtain missing required sign-off or submission confirmation for ${item.label}.`;
    } else {
      status = "SATISFIED";
      impact = "LOW";
      description = `'${item.label}' requirements and dependencies are verified without blockers`;
    }

    const nodeEv = graph.nodes.find((n) => n.id === item.nodeId);

    conditions.push({
      id: `cond_${crypto.randomUUID()}`,
      description,
      status,
      requiredFor: [item.label],
      evidenceIds: nodeEv?.evidenceIds || [],
      impact,
      estimatedSlackDays: item.totalFloat,
      suggestedAction,
    });
  }

  // Summary counts
  const satisfiedCount = conditions.filter((c) => c.status === "SATISFIED").length;
  const uncertainCount = conditions.filter((c) => c.status === "UNCERTAIN").length;
  const blockedCount = conditions.filter((c) => c.status === "BLOCKED").length;
  const contradictedCount = conditions.filter((c) => c.status === "CONTRADICTED").length;

  const achievable = blockedCount === 0 && contradictedCount === 0 && cpm.totalExpectedDays <= targetDays;
  const criticalConditions = conditions.filter((c) => c.impact === "CRITICAL" || c.status !== "SATISFIED");

  return {
    projectId,
    target: "Successful Onboarding & Submission",
    targetDate,
    achievable,
    totalConditions: conditions.length,
    satisfiedCount,
    uncertainCount,
    blockedCount,
    contradictedCount,
    conditions,
    criticalConditions,
    evaluatedAt: new Date().toISOString(),
  };
}

