"use client";

import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node as FlowNode,
  Edge as FlowEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ProcessGraph, Node as EpistemicNode, Edge as EpistemicEdge, Evidence } from "@epistemic/shared";

interface InteractiveGraphProps {
  graph: ProcessGraph;
  onInspectElement: (item: {
    title: string;
    claimText?: string;
    relationType?: string;
    confidence?: number;
    evidence?: Evidence[];
  }) => void;
}

export function InteractiveGraph({
  graph,
  onInspectElement,
}: InteractiveGraphProps) {
  // Compute node layout (grid/dag column based)
  const { nodes, edges } = useMemo(() => {
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: FlowNode[] = [];
    const flowEdges: FlowEdge[] = [];

    // Separate nodes by types for layout columns
    const docNodes = graph.nodes.filter((n) => n.type === "DOCUMENT");
    const obligationNodes = graph.nodes.filter(
      (n) => n.type === "OBLIGATION" || n.type === "DEADLINE"
    );
    const authNodes = graph.nodes.filter(
      (n) => n.type === "APPROVAL" || n.type === "ACTOR" || n.type === "VERIFICATION"
    );
    const otherNodes = graph.nodes.filter(
      (n) =>
        n.type !== "DOCUMENT" &&
        n.type !== "OBLIGATION" &&
        n.type !== "DEADLINE" &&
        n.type !== "APPROVAL" &&
        n.type !== "ACTOR" &&
        n.type !== "VERIFICATION"
    );

    const columns = [docNodes, obligationNodes, authNodes, otherNodes];

    columns.forEach((col, colIdx) => {
      col.forEach((node, rowIdx) => {
        let borderColor = "#3b82f6"; // blue
        let bgColor = "rgba(17, 24, 39, 0.9)";
        let badgeColor = "bg-blue-900/60 text-blue-300";

        if (node.type === "DOCUMENT") {
          borderColor = "#6366f1"; // indigo
          badgeColor = "bg-indigo-900/60 text-indigo-300";
        } else if (node.type === "DEADLINE") {
          borderColor = "#f43f5e"; // rose
          badgeColor = "bg-rose-900/60 text-rose-300";
        } else if (node.type === "APPROVAL" || node.type === "ACTOR") {
          borderColor = "#06b6d4"; // cyan
          badgeColor = "bg-cyan-900/60 text-cyan-300";
        } else if (node.type === "VERIFICATION") {
          borderColor = "#10b981"; // emerald
          badgeColor = "bg-emerald-900/60 text-emerald-300";
        }

        flowNodes.push({
          id: node.id,
          position: { x: colIdx * 280 + 50, y: rowIdx * 130 + 50 },
          data: {
            label: (
              <div
                className="p-3 text-left space-y-1 select-none"
                style={{
                  background: bgColor,
                  borderRadius: "8px",
                  border: `1.5px solid ${borderColor}`,
                  minWidth: "200px",
                  maxWidth: "240px",
                  color: "#f3f4f6",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${badgeColor}`}>
                    {node.type}
                  </span>
                  <span className="text-gray-400">
                    {(node.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs font-semibold text-white truncate">
                  {node.label}
                </p>
                {node.description && (
                  <p className="text-[10px] text-gray-400 truncate">
                    {node.description}
                  </p>
                )}
              </div>
            ),
            rawNode: node,
          },
        });
      });
    });

    // Build flow edges
    graph.edges.forEach((e) => {
      let strokeColor = "#3b82f6";
      let animated = false;

      if (e.type === "contradicts") {
        strokeColor = "#f43f5e";
        animated = true;
      } else if (e.type === "authorizes") {
        strokeColor = "#06b6d4";
      } else if (e.type === "verifies") {
        strokeColor = "#10b981";
      }

      flowEdges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type,
        labelStyle: { fill: "#9ca3af", fontSize: 10, fontFamily: "monospace" },
        labelBgStyle: { fill: "#111827", fillOpacity: 0.9 },
        style: { stroke: strokeColor, strokeWidth: 1.5 },
        animated,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
        },
        data: { rawEdge: e },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [graph]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      const raw = node.data.rawNode as EpistemicNode;
      if (!raw) return;

      const nodeEv = graph.evidence.filter((ev) =>
        raw.evidenceIds.includes(ev.id)
      );

      onInspectElement({
        title: raw.label,
        claimText: raw.description || raw.label,
        relationType: raw.type,
        confidence: raw.confidence,
        evidence: nodeEv.length > 0 ? nodeEv : graph.evidence.slice(0, 1),
      });
    },
    [graph, onInspectElement]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: FlowEdge) => {
      const raw = edge.data?.rawEdge as EpistemicEdge;
      if (!raw) return;

      const edgeEv = graph.evidence.filter((ev) =>
        raw.evidenceIds.includes(ev.id)
      );

      onInspectElement({
        title: `Relationship: ${raw.type}`,
        claimText: `${raw.source} --[${raw.type}]--> ${raw.target}`,
        relationType: raw.type,
        confidence: raw.confidence,
        evidence: edgeEv.length > 0 ? edgeEv : graph.evidence.slice(0, 1),
      });
    },
    [graph, onInspectElement]
  );

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-12 text-center text-xs text-gray-400">
        No graph nodes available. Upload a document and run process analysis.
      </div>
    );
  }

  return (
    <div className="w-full h-[460px] border border-border rounded-xl bg-surface/50 overflow-hidden relative shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        fitView
        className="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1f293d" />
        <Controls className="bg-surface border border-border text-white fill-white" />
      </ReactFlow>
      <div className="absolute top-3 left-3 bg-surface/90 border border-border px-3 py-1.5 rounded-lg text-[10px] font-mono text-gray-400 backdrop-blur pointer-events-none">
        💡 Click any node or edge to inspect provenance & source evidence
      </div>
    </div>
  );
}

