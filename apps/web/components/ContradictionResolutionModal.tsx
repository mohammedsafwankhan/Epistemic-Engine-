"use client";

import React, { useState } from "react";
import { Contradiction } from "@epistemic/shared";

interface ContradictionResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contradiction: Contradiction;
  onResolve: (
    contradictionId: string,
    resolution: "ACCEPTED_A" | "ACCEPTED_B" | "DISPUTED",
    notes?: string
  ) => Promise<void>;
}

export function ContradictionResolutionModal({
  isOpen,
  onClose,
  contradiction,
  onResolve,
}: ContradictionResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<
    "ACCEPTED_A" | "ACCEPTED_B" | "DISPUTED"
  >("ACCEPTED_A");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onResolve(contradiction.id, selectedResolution, notes);
      setSubmitting(false);
      onClose();
    } catch (err: unknown) {
      setSubmitting(false);
      alert(err instanceof Error ? err.message : "Failed to record resolution");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider font-semibold">
              Contradiction Resolution Center
            </span>
            <h3 className="text-sm font-bold text-white">
              {contradiction.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-300">{contradiction.description}</p>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Claim A */}
          <div
            onClick={() => setSelectedResolution("ACCEPTED_A")}
            className={`border rounded-lg p-3.5 space-y-2 cursor-pointer transition-all ${
              selectedResolution === "ACCEPTED_A"
                ? "border-accent bg-accent/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "border-border bg-background/60 hover:border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-accent">Document A Claim</span>
              <input
                type="radio"
                name="resolution"
                checked={selectedResolution === "ACCEPTED_A"}
                onChange={() => setSelectedResolution("ACCEPTED_A")}
                className="text-accent"
              />
            </div>
            <p className="text-white font-medium">{contradiction.claimA}</p>
            <div className="text-[10px] text-gray-400 border-t border-border/60 pt-2 space-y-1">
              <span className="font-mono text-gray-500 block">
                Source: {contradiction.evidenceA.documentName || "Document 1"} (Page {contradiction.evidenceA.pageNumber})
              </span>
              <p className="italic text-gray-300">
                &ldquo;{contradiction.evidenceA.snippet}&rdquo;
              </p>
            </div>
          </div>

          {/* Claim B */}
          <div
            onClick={() => setSelectedResolution("ACCEPTED_B")}
            className={`border rounded-lg p-3.5 space-y-2 cursor-pointer transition-all ${
              selectedResolution === "ACCEPTED_B"
                ? "border-accent bg-accent/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "border-border bg-background/60 hover:border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-accent">Document B Claim</span>
              <input
                type="radio"
                name="resolution"
                checked={selectedResolution === "ACCEPTED_B"}
                onChange={() => setSelectedResolution("ACCEPTED_B")}
                className="text-accent"
              />
            </div>
            <p className="text-white font-medium">{contradiction.claimB}</p>
            <div className="text-[10px] text-gray-400 border-t border-border/60 pt-2 space-y-1">
              <span className="font-mono text-gray-500 block">
                Source: {contradiction.evidenceB.documentName || "Document 2"} (Page {contradiction.evidenceB.pageNumber})
              </span>
              <p className="italic text-gray-300">
                &ldquo;{contradiction.evidenceB.snippet}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* Disputed option */}
        <div
          onClick={() => setSelectedResolution("DISPUTED")}
          className={`border rounded-lg p-2.5 text-xs flex items-center justify-between cursor-pointer transition-all ${
            selectedResolution === "DISPUTED"
              ? "border-amber-500 bg-amber-950/20"
              : "border-border bg-background/40 hover:border-gray-600"
          }`}
        >
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-300">
              Keep as Disputed / Unresolved
            </span>
            <p className="text-[11px] text-gray-400">
              Evidence is insufficient; flag for institutional coordinator review.
            </p>
          </div>
          <input
            type="radio"
            name="resolution"
            checked={selectedResolution === "DISPUTED"}
            onChange={() => setSelectedResolution("DISPUTED")}
            className="text-amber-500"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1 text-xs">
          <label className="text-gray-400 block text-[11px]">
            Resolution Rationale / Audit Note (Optional):
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Verified with university DSO that the official deadline is September 30."
            className="w-full bg-background border border-border rounded-lg p-2.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-accent"
          />
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white disabled:opacity-40 shadow-sm"
          >
            {submitting ? "Saving Resolution..." : "Confirm Resolution Decision"}
          </button>
        </div>
      </div>
    </div>
  );
}

