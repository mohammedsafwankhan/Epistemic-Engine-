"use client";

import React from "react";
import { Evidence } from "@epistemic/shared";

interface ProvenanceInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  claimText?: string;
  relationType?: string;
  confidence?: number;
  extractionMode?: "bedrock" | "deterministic-fallback";
  evidence?: Evidence[];
}

export function ProvenanceInspector({
  isOpen,
  onClose,
  title,
  claimText,
  relationType,
  confidence = 0.95,
  extractionMode = "deterministic-fallback",
  evidence = [],
}: ProvenanceInspectorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-accent uppercase tracking-wider font-semibold">
              Provenance & Evidence Inspector
            </span>
            <h3 className="text-sm font-bold text-white truncate max-w-md">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Claim / Relation Info */}
        <div className="space-y-2 text-xs">
          {claimText && (
            <div className="bg-background/80 p-3 rounded-lg border border-border">
              <span className="text-[10px] font-mono uppercase text-gray-500 block">
                Structured Claim
              </span>
              <p className="text-gray-200 mt-0.5 font-medium">{claimText}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {relationType && (
              <div className="bg-background/60 p-2.5 rounded border border-border/50">
                <span className="text-[10px] uppercase font-mono text-gray-500 block">
                  Relation
                </span>
                <span className="text-white font-mono font-semibold">
                  {relationType}
                </span>
              </div>
            )}
            <div className="bg-background/60 p-2.5 rounded border border-border/50">
              <span className="text-[10px] uppercase font-mono text-gray-500 block">
                Confidence
              </span>
              <span className="text-accent font-mono font-semibold">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="bg-background/60 p-2.5 rounded border border-border/50">
              <span className="text-[10px] uppercase font-mono text-gray-500 block">
                Extraction Mode
              </span>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold">
                {extractionMode === "bedrock" ? "Bedrock Claude" : "Deterministic"}
              </span>
            </div>
          </div>
        </div>

        {/* Verbatim Evidence Citations */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
            Source Document Citations ({evidence.length})
          </span>

          {evidence.length === 0 ? (
            <div className="border border-dashed border-border p-4 rounded text-center text-xs text-gray-400">
              No direct snippet citation attached. Inferred through structural dependency rules.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-background border border-border p-3 rounded-lg space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span className="text-gray-300 font-semibold truncate max-w-[200px]">
                      📄 {ev.documentName || ev.documentId}
                    </span>
                    <span>Page {ev.pageNumber}</span>
                  </div>
                  <blockquote className="border-l-2 border-accent/70 pl-2 text-gray-300 italic text-[11px]">
                    &ldquo;{ev.snippet}&rdquo;
                  </blockquote>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-surface-hover hover:bg-gray-700 text-white transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

