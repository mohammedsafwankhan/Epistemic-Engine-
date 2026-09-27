"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProcessType } from "@epistemic/shared";
import { api, ApiClientError } from "../../lib/api/client";

const PROCESS_OPTIONS: { type: ProcessType; label: string; desc: string }[] = [
  {
    type: "INTERNSHIP_ONBOARDING",
    label: "Internship / University Onboarding",
    desc: "Convert offer letters, university forms, NDA, and tax guidelines into a structured dependency plan.",
  },
  {
    type: "SCHOLARSHIP_APPLICATION",
    label: "Scholarship Application",
    desc: "Verify eligibility criteria, deadlines, recommendation letter dependencies, and essay constraints.",
  },
  {
    type: "VISA_PERMIT",
    label: "Visa & Permit Application",
    desc: "Track biometric dates, consular evidence chains, financial thresholds, and legal validity periods.",
  },
  {
    type: "COMPLIANCE_WORKFLOW",
    label: "Compliance & Security Workflow",
    desc: "Map regulatory frameworks, audit trails, policy attestations, and compliance obligations.",
  },
  {
    type: "GENERIC_PROCESS",
    label: "Custom Process Workflow",
    desc: "Generic structured epistemic model for arbitrary multi-party organizational procedures.",
  },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [processType, setProcessType] = useState<ProcessType>("INTERNSHIP_ONBOARDING");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Process name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const project = await api.createProject({
        name: name.trim(),
        processType,
        description: description.trim() || undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred while creating the process.");
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-white transition-colors">
          Processes
        </Link>
        <span>/</span>
        <span className="text-gray-200">New Process</span>
      </div>

      <div className="border border-border bg-surface/60 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Initialize Process Model
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Establish a new epistemic domain context for ingestion and constraint reasoning.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-lg border border-rose-800/80 bg-rose-950/30 text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Process Name */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Process Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="e.g. Summer 2026 SWE Internship Onboarding"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Process Type */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Domain / Process Type <span className="text-rose-400">*</span>
            </label>
            <div className="space-y-2">
              {PROCESS_OPTIONS.map((opt) => (
                <label
                  key={opt.type}
                  className={`block border rounded-lg p-3.5 cursor-pointer transition-all ${
                    processType === opt.type
                      ? "border-primary-500 bg-primary-950/20"
                      : "border-border bg-surface/40 hover:bg-surface-hover/50"
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="radio"
                      name="processType"
                      value={opt.type}
                      checked={processType === opt.type}
                      onChange={() => setProcessType(opt.type)}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-white">
                        {opt.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-gray-300 uppercase tracking-wider"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Optional notes regarding deadlines, stakeholders, or specific guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white transition-colors shadow-sm"
            >
              {isSubmitting ? "Creating..." : "Initialize Process"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

