import {
  ProcessGraph,
  SimulationResult,
  TaskDuration,
} from "@epistemic/shared";
import {
  calculateCriticalPath,
  assignNodeDurations,
} from "./criticalPathEngine.js";

/**
 * Samples a random duration from a triangular distribution (min=a, mode=m, max=b).
 */
function sampleTriangular(a: number, m: number, b: number): number {
  if (a === b) return a;
  const u = Math.random();
  const fc = (m - a) / (b - a);
  if (u < fc) {
    return a + Math.sqrt(u * (b - a) * (m - a));
  } else {
    return b - Math.sqrt((1 - u) * (b - a) * (b - m));
  }
}

export function runMonteCarloSimulation(
  projectId: string,
  graph: ProcessGraph,
  targetDateStr?: string,
  iterations: number = 5000,
  customDurations?: Map<string, TaskDuration>
): SimulationResult {
  // Validate iterations
  const cleanIterations = Math.max(100, Math.min(20000, iterations || 5000));

  const { durations: defaultDurations, assumptions } = assignNodeDurations(graph);
  const durations = customDurations || defaultDurations;

  // Calculate baseline CPM
  const cpm = calculateCriticalPath(graph, durations);

  const taskNodes = graph.nodes.filter(
    (n) => n.type !== "DOCUMENT" && n.type !== "EVIDENCE"
  );

  const taskNodeIds = new Set(taskNodes.map((n) => n.id));
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();

  for (const node of taskNodes) {
    successors.set(node.id, []);
    predecessors.set(node.id, []);
  }

  for (const edge of graph.edges) {
    if (taskNodeIds.has(edge.source) && taskNodeIds.has(edge.target)) {
      successors.get(edge.source)!.push(edge.target);
      predecessors.get(edge.target)!.push(edge.source);
    }
  }

  // Calculate target days from now or use baseline + margin
  const now = new Date();
  let targetDays = cpm.totalExpectedDays;
  let finalTargetDate = new Date(now.getTime() + (cpm.totalExpectedDays + 2) * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  if (targetDateStr) {
    finalTargetDate = targetDateStr;
    const targetTime = new Date(targetDateStr).getTime();
    if (!isNaN(targetTime)) {
      const diffDays = Math.max(1, Math.ceil((targetTime - now.getTime()) / (1000 * 60 * 60 * 24)));
      targetDays = diffDays;
    }
  }

  // Run Monte Carlo Iterations
  let misses = 0;
  let totalSimulatedDuration = 0;

  for (let iter = 0; iter < cleanIterations; iter++) {
    // Sample durations for this trial
    const trialDurations = new Map<string, number>();
    for (const [id, dur] of durations.entries()) {
      trialDurations.set(id, sampleTriangular(dur.minDays, dur.likelyDays, dur.maxDays));
    }

    // Forward pass
    const trialEf = new Map<string, number>();

    for (const item of cpm.schedule) {
      const preds = predecessors.get(item.nodeId) || [];
      const maxPred = preds.length === 0 ? 0 : Math.max(...preds.map((p) => trialEf.get(p) || 0));
      const sampledDur = trialDurations.get(item.nodeId) || 2;
      trialEf.set(item.nodeId, maxPred + sampledDur);
    }

    const trialTotalDays = Math.max(...Array.from(trialEf.values()), 0);
    totalSimulatedDuration += trialTotalDays;

    if (trialTotalDays > targetDays) {
      misses++;
    }
  }

  const probMiss = Number((misses / cleanIterations).toFixed(3));
  const probSuccess = Number((1 - probMiss).toFixed(3));
  const avgDurationDays = Number((totalSimulatedDuration / cleanIterations).toFixed(1));

  const expectedCompletion = new Date(now.getTime() + avgDurationDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return {
    projectId,
    targetDate: finalTargetDate,
    iterations: cleanIterations,
    probabilityOfSuccess: probSuccess,
    probabilityOfDeadlineMiss: probMiss,
    expectedCompletionDays: avgDurationDays,
    expectedCompletionDate: expectedCompletion,
    criticalPath: cpm.criticalPath,
    floatDays: Math.max(0, targetDays - avgDurationDays),
    assumptions,
    simulatedAt: new Date().toISOString(),
  };
}

