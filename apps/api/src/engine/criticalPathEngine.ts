import {
  ProcessGraph,
  Node,
  CriticalPathItem,
  TaskDuration,
  DurationAssumption,
} from "@epistemic/shared";

/**
 * Assigns realistic task duration distributions with explicit provenance tracking.
 */
export function assignNodeDurations(graph: ProcessGraph): {
  durations: Map<string, TaskDuration>;
  assumptions: DurationAssumption[];
} {
  const durations = new Map<string, TaskDuration>();
  const assumptions: DurationAssumption[] = [];

  for (const node of graph.nodes) {
    if (node.type === "DOCUMENT" || node.type === "EVIDENCE") {
      continue;
    }

    const labelLower = node.label.toLowerCase();
    let duration: TaskDuration;

    if (/cpt|opt|visa|immigration/i.test(labelLower)) {
      duration = {
        minDays: 3,
        likelyDays: 5,
        maxDays: 10,
        source: "SYSTEM_PRIOR",
        description: "University international student office processing window",
      };
    } else if (/advisor|faculty|approval|chair|authoriz/i.test(labelLower)) {
      duration = {
        minDays: 2,
        likelyDays: 4,
        maxDays: 7,
        source: "DEMO_ASSUMPTION",
        description: "Faculty academic advisor review and endorsement turnaround",
      };
    } else if (/background check|drug test|screening/i.test(labelLower)) {
      duration = {
        minDays: 3,
        likelyDays: 5,
        maxDays: 8,
        source: "DEMO_ASSUMPTION",
        description: "Third-party background verification clearing timeline",
      };
    } else if (/w-4|tax|i-9|direct deposit|payroll/i.test(labelLower)) {
      duration = {
        minDays: 1,
        likelyDays: 2,
        maxDays: 3,
        source: "SYSTEM_PRIOR",
        description: "Employee onboarding portal form completion",
      };
    } else if (/offer|accept|sign/i.test(labelLower)) {
      duration = {
        minDays: 1,
        likelyDays: 2,
        maxDays: 4,
        source: "DOCUMENT_EVIDENCE",
        description: "Offer letter acceptance return requirement",
      };
    } else {
      duration = {
        minDays: 1,
        likelyDays: 2,
        maxDays: 3,
        source: "DEMO_ASSUMPTION",
        description: "Standard administrative process task step",
      };
    }

    durations.set(node.id, duration);
    assumptions.push({
      task: node.label,
      minDays: duration.minDays,
      likelyDays: duration.likelyDays,
      maxDays: duration.maxDays,
      source: duration.source,
      evidenceSnippet: duration.description,
    });
  }

  return { durations, assumptions };
}

export interface CriticalPathResult {
  criticalPath: CriticalPathItem[];
  schedule: CriticalPathItem[];
  totalExpectedDays: number;
  assumptions: DurationAssumption[];
}

/**
 * Computes deterministic Critical Path Method (CPM) metrics over the graph DAG.
 */
export function calculateCriticalPath(
  graph: ProcessGraph,
  customDurations?: Map<string, TaskDuration>
): CriticalPathResult {
  const { durations: defaultDurations, assumptions } = assignNodeDurations(graph);
  const durations = customDurations || defaultDurations;

  // Filter actionable task nodes
  const taskNodes = graph.nodes.filter(
    (n) => n.type !== "DOCUMENT" && n.type !== "EVIDENCE"
  );

  if (taskNodes.length === 0) {
    return {
      criticalPath: [],
      schedule: [],
      totalExpectedDays: 0,
      assumptions: [],
    };
  }

  // Build adjacency
  const taskNodeIds = new Set(taskNodes.map((n) => n.id));
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of taskNodes) {
    successors.set(node.id, []);
    predecessors.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    if (taskNodeIds.has(edge.source) && taskNodeIds.has(edge.target)) {
      successors.get(edge.source)!.push(edge.target);
      predecessors.get(edge.target)!.push(edge.source);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Topological sorting (Kahn's algorithm)
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    topoOrder.push(curr);
    for (const succ of successors.get(curr) || []) {
      const newDeg = (inDegree.get(succ) || 0) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) {
        queue.push(succ);
      }
    }
  }

  // If graph contains disconnected or cycles, include remaining nodes
  for (const node of taskNodes) {
    if (!topoOrder.includes(node.id)) {
      topoOrder.push(node.id);
    }
  }

  // Forward Pass: Early Start (ES) and Early Finish (EF)
  const es = new Map<string, number>();
  const ef = new Map<string, number>();

  for (const id of topoOrder) {
    const preds = predecessors.get(id) || [];
    const maxPredEf = preds.length === 0 ? 0 : Math.max(...preds.map((p) => ef.get(p) || 0));
    const dur = durations.get(id)?.likelyDays || 2;
    es.set(id, maxPredEf);
    ef.set(id, maxPredEf + dur);
  }

  const maxProjectDays = Math.max(...Array.from(ef.values()), 0);

  // Backward Pass: Late Start (LS) and Late Finish (LF)
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const succs = successors.get(id) || [];
    const minSuccLs = succs.length === 0 ? maxProjectDays : Math.min(...succs.map((s) => ls.get(s) || maxProjectDays));
    const dur = durations.get(id)?.likelyDays || 2;
    lf.set(id, minSuccLs);
    ls.set(id, minSuccLs - dur);
  }

  // Schedule items & Float calculation
  const schedule: CriticalPathItem[] = [];
  const criticalItems: CriticalPathItem[] = [];

  for (const node of taskNodes) {
    const earlyStart = es.get(node.id) || 0;
    const earlyFinish = ef.get(node.id) || 0;
    const lateStart = ls.get(node.id) || 0;
    const lateFinish = lf.get(node.id) || 0;
    const totalFloat = Math.max(0, lateStart - earlyStart);
    const dur = durations.get(node.id)?.likelyDays || 2;
    const isCritical = totalFloat === 0;

    const item: CriticalPathItem = {
      nodeId: node.id,
      label: node.label,
      state: node.state || "NOT_STARTED",
      durationDays: dur,
      earlyStart,
      earlyFinish,
      lateStart,
      lateFinish,
      totalFloat,
      isCritical,
    };

    schedule.push(item);
    if (isCritical) {
      criticalItems.push(item);
    }
  }

  // Sort critical path chronologically
  criticalItems.sort((a, b) => a.earlyStart - b.earlyStart);

  return {
    criticalPath: criticalItems,
    schedule,
    totalExpectedDays: maxProjectDays,
    assumptions,
  };
}

