import {
  ProcessGraph,
  CounterfactualChange,
  CounterfactualResult,
  TaskDuration,
} from "@epistemic/shared";
import { runMonteCarloSimulation } from "./monteCarloSimulator.js";
import { assignNodeDurations } from "./criticalPathEngine.js";

export function evaluateCounterfactualScenario(
  projectId: string,
  graph: ProcessGraph,
  changes: CounterfactualChange[],
  targetDateStr?: string,
  iterations: number = 5000
): CounterfactualResult {
  // 1. Run Baseline Simulation
  const baseline = runMonteCarloSimulation(projectId, graph, targetDateStr, iterations);

  // 2. Clone and modify task durations for Scenario
  const { durations: baselineDurations } = assignNodeDurations(graph);
  const scenarioDurations = new Map<string, TaskDuration>();

  for (const [nodeId, dur] of baselineDurations.entries()) {
    scenarioDurations.set(nodeId, { ...dur });
  }

  // Apply Changes Immutably
  for (const change of changes) {
    // Find matching node by id or label
    let targetKey: string | undefined = undefined;
    for (const [id] of scenarioDurations.entries()) {
      const node = graph.nodes.find((n) => n.id === id);
      if (id === change.nodeId || node?.label.toLowerCase().includes(change.nodeId.toLowerCase())) {
        targetKey = id;
        break;
      }
    }

    if (targetKey && scenarioDurations.has(targetKey)) {
      const current = scenarioDurations.get(targetKey)!;

      if (change.state === "COMPLETED" || change.resolved) {
        // If task is completed/resolved, duration becomes 0
        scenarioDurations.set(targetKey, {
          minDays: 0,
          likelyDays: 0,
          maxDays: 0,
          source: "USER_INPUT",
          description: "Counterfactual scenario: Task marked completed",
        });
      } else if (typeof change.durationDeltaDays === "number") {
        const delta = change.durationDeltaDays;
        scenarioDurations.set(targetKey, {
          minDays: Math.max(0.1, current.minDays + delta),
          likelyDays: Math.max(0.2, current.likelyDays + delta),
          maxDays: Math.max(0.5, current.maxDays + delta),
          source: "USER_INPUT",
          description: `Counterfactual scenario: Adjusted duration by ${delta > 0 ? "+" : ""}${delta} days`,
        });
      }
    }
  }

  // 3. Run Scenario Simulation
  const scenario = runMonteCarloSimulation(
    projectId,
    graph,
    targetDateStr,
    iterations,
    scenarioDurations
  );

  const deltaProbability = Number(
    (scenario.probabilityOfDeadlineMiss - baseline.probabilityOfDeadlineMiss).toFixed(3)
  );
  const deltaCompletionDays = Number(
    (scenario.expectedCompletionDays - baseline.expectedCompletionDays).toFixed(1)
  );

  return {
    projectId,
    baseline,
    scenario,
    deltaProbability,
    deltaCompletionDays,
    changesApplied: changes,
  };
}

