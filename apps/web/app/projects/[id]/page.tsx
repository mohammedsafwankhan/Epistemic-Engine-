"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Project,
  Document,
  ProcessGraph,
  Contradiction,
  Unknown,
  Fact,
  RiskAnalysisResult,
  WhatWouldHaveToBeTrueResult,
  CounterfactualResult,
  AdversaryAuditReport,
  Evidence,
} from "@epistemic/shared";
import { api, ApiClientError } from "../../../lib/api/client";
import { StatusBadge } from "../../../components/StatusBadge";
import { InteractiveGraph } from "../../../components/InteractiveGraph";
import { ProvenanceInspector } from "../../../components/ProvenanceInspector";
import { ContradictionResolutionModal } from "../../../components/ContradictionResolutionModal";

export default function ProjectDashboardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [graph, setGraph] = useState<ProcessGraph | null>(null);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [unknowns, setUnknowns] = useState<Unknown[]>([]);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [risk, setRisk] = useState<RiskAnalysisResult | null>(null);
  const [whatTrue, setWhatTrue] = useState<WhatWouldHaveToBeTrueResult | null>(
    null
  );
  const [counterResult, setCounterResult] =
    useState<CounterfactualResult | null>(null);
  const [adversaryReport, setAdversaryReport] =
    useState<AdversaryAuditReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Provenance Inspector State
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<{
    title: string;
    claimText?: string;
    relationType?: string;
    confidence?: number;
    evidence?: Evidence[];
  }>({ title: "" });

  // Contradiction Resolution Modal State
  const [selectedContraForResolve, setSelectedContraForResolve] =
    useState<Contradiction | null>(null);

  // Counterfactual scenario inputs
  const [selectedTaskDelta, setSelectedTaskDelta] = useState<number>(-2);
  const [selectedTaskNode, setSelectedTaskNode] = useState<string>("");
  const [targetDateInput, setTargetDateInput] = useState<string>("");

  const [activeTab, setActiveTab] = useState<
    | "what-true"
    | "interactive-graph"
    | "critical-path"
    | "counterfactual"
    | "contradictions"
    | "adversary"
    | "unknowns"
    | "facts"
  >("what-true");

  const loadData = async (id: string, targetDate?: string) => {
    try {
      setLoading(true);
      setError(null);

      const [
        projData,
        docsData,
        graphData,
        contraData,
        unkData,
        factsData,
        riskData,
        whatTrueData,
        adversaryData,
      ] = await Promise.all([
        api.getProject(id),
        api.listDocuments(id),
        api.getGraph(id).catch(() => null),
        api.getContradictions(id).catch(() => []),
        api.getUnknowns(id).catch(() => []),
        api.getFacts(id).catch(() => []),
        api.getRisk(id).catch(() => null),
        api.getWhatWouldHaveToBeTrue(id, targetDate).catch(() => null),
        api.getAdversaryAudit(id).catch(() => null),
      ]);

      setProject(projData);
      setDocuments(docsData);
      setGraph(graphData);
      setContradictions(contraData);
      setUnknowns(unkData);
      setFacts(factsData);
      setRisk(riskData);
      setWhatTrue(whatTrueData);
      setAdversaryReport(adversaryData);

      if (whatTrueData?.targetDate && !targetDateInput) {
        setTargetDateInput(whatTrueData.targetDate);
      }
      setLoading(false);
    } catch (err: unknown) {
      setError(
        err instanceof ApiClientError ? err.message : "Failed to load project"
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadData(projectId);
    }
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    try {
      setUploading(true);
      await api.uploadDocument(projectId, file);
      setUploading(false);
      await loadData(projectId);
    } catch (err: unknown) {
      setUploading(false);
      alert(
        err instanceof ApiClientError ? err.message : "Failed to upload file"
      );
    }
  };

  const handleRunAnalysis = async () => {
    if (!projectId) return;

    try {
      setAnalyzing(true);
      await api.runAnalysis(projectId);
      setAnalyzing(false);
      await loadData(projectId);
    } catch (err: unknown) {
      setAnalyzing(false);
      alert(err instanceof ApiClientError ? err.message : "Analysis failed");
    }
  };

  const handleTargetDateChange = async (newDate: string) => {
    setTargetDateInput(newDate);
    if (!projectId) return;
    try {
      const res = await api.getWhatWouldHaveToBeTrue(projectId, newDate);
      setWhatTrue(res);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleRunCounterfactual = async () => {
    if (!projectId || !selectedTaskNode) return;

    try {
      setSimulating(true);
      const res = await api.runCounterfactual(
        projectId,
        [
          {
            nodeId: selectedTaskNode,
            durationDeltaDays: Number(selectedTaskDelta),
          },
        ],
        targetDateInput || undefined,
        5000
      );
      setCounterResult(res);
      setSimulating(false);
    } catch (err: unknown) {
      setSimulating(false);
      alert(
        err instanceof ApiClientError
          ? err.message
          : "Counterfactual simulation failed"
      );
    }
  };

  const handleResolveContradiction = async (
    contradictionId: string,
    resolution: "ACCEPTED_A" | "ACCEPTED_B" | "DISPUTED",
    notes?: string
  ) => {
    if (!projectId) return;
    await api.resolveContradiction(projectId, contradictionId, resolution, notes);
    await loadData(projectId);
  };

  const handleOpenInspector = (data: {
    title: string;
    claimText?: string;
    relationType?: string;
    confidence?: number;
    evidence?: Evidence[];
  }) => {
    setInspectorData(data);
    setInspectorOpen(true);
  };

  if (loading) {
    return (
      <div className="border border-border bg-surface/30 rounded-xl p-16 text-center">
        <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-gray-400">
          Loading Epistemic Command Center...
        </p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Processes
        </Link>
        <div className="border border-rose-900/50 bg-rose-950/20 rounded-xl p-8 text-center text-rose-300">
          <p className="text-base font-semibold">Project Not Found</p>
          <p className="text-xs text-rose-400/80 mt-1">{error}</p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-500 text-white"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isAnalyzed = project.status === "ANALYZED" || facts.length > 0;
  const missRiskPercent = risk ? Math.round(risk.probabilityOfMiss * 100) : 0;
  const unresolvedContras = contradictions.filter(
    (c) => c.status !== "RESOLVED"
  );
  const blockingUnknowns = unknowns.filter((u) => u.blocking);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <Link href="/" className="hover:text-white transition-colors">
          Processes
        </Link>
        <span>/</span>
        <span className="text-gray-200 font-mono">{project.id}</span>
      </div>

      {/* Hero Command Center Header */}
      <div className="border border-border bg-surface/70 rounded-xl p-6 sm:p-8 space-y-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                {project.processType}
              </span>
              <StatusBadge status={project.status} />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                Phase 4 Trust & Adversary Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-xs text-gray-400 max-w-2xl mt-1">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing || documents.length === 0}
              className="inline-flex items-center px-4 py-2.5 rounded-lg text-xs font-semibold bg-accent hover:bg-cyan-400 text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_16px_rgba(6,182,212,0.4)]"
            >
              {analyzing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin mr-2" />
                  Reasoning Pipeline Running...
                </>
              ) : (
                "⚡ Run Process Analysis"
              )}
            </button>
          </div>
        </div>

        {/* Command Center Risk & Alerts Banner */}
        {risk && (
          <div className="border border-border/80 bg-background/85 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold">
                Estimated under modeled assumptions (5,000 Monte Carlo PERT trials)
              </span>
              <div className="flex items-baseline space-x-3">
                <span
                  className={`text-4xl font-black ${
                    missRiskPercent > 40
                      ? "text-rose-400"
                      : missRiskPercent > 20
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {missRiskPercent}%
                </span>
                <div className="space-y-0.5">
                  <span className="text-xs text-gray-200 font-semibold block">
                    Estimated Deadline Miss Risk
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    Target:{" "}
                    <span className="text-white font-mono">
                      {risk.targetDeadline}
                    </span>{" "}
                    • Expected:{" "}
                    <span className="text-white font-mono">
                      {risk.expectedCompletionDate}
                    </span>{" "}
                    ({risk.expectedCompletionDays} days)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab("unknowns")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  blockingUnknowns.length > 0
                    ? "bg-rose-950/60 border-rose-800 text-rose-300"
                    : "bg-surface border-border text-gray-400"
                }`}
              >
                🔴 {blockingUnknowns.length} Blocking Unknowns
              </button>

              <button
                onClick={() => setActiveTab("contradictions")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  unresolvedContras.length > 0
                    ? "bg-amber-950/60 border-amber-800 text-amber-300"
                    : "bg-surface border-border text-gray-400"
                }`}
              >
                🟠 {unresolvedContras.length} Contradictions
              </button>

              <button
                onClick={() => setActiveTab("critical-path")}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-950/60 border border-primary-800 text-primary-300 hover:bg-primary-900/60 transition-colors"
              >
                🟡 {risk.criticalPath.length} Critical Path Tasks
              </button>

              <button
                onClick={() => setActiveTab("what-true")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-accent/20 border border-accent/60 text-accent hover:bg-accent/30 transition-all"
              >
                [ What Would Have to Be True? ]
              </button>
            </div>
          </div>
        )}

        {/* Metric Summary Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 border-t border-border/80">
          <div className="bg-background/50 border border-border/50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Documents
            </span>
            <p className="text-base font-bold text-white mt-0.5">
              {documents.length}
            </p>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Facts
            </span>
            <p className="text-base font-bold text-white mt-0.5">
              {facts.length}
            </p>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Graph Nodes
            </span>
            <p className="text-base font-bold text-white mt-0.5">
              {graph?.nodes.length || 0}
            </p>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Contradictions
            </span>
            <p className="text-base font-bold text-rose-400 mt-0.5">
              {contradictions.length}
            </p>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Unknowns
            </span>
            <p className="text-base font-bold text-amber-400 mt-0.5">
              {unknowns.length}
            </p>
          </div>
          <div className="bg-background/50 border border-border/50 rounded-lg p-2.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              Adversary Findings
            </span>
            <p className="text-base font-bold text-purple-400 mt-0.5">
              {adversaryReport?.totalFindings || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Ingestion on Left + Command Center Tabs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Documents List & Upload */}
        <div className="lg:col-span-1 border border-border bg-surface/40 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Process Documents ({documents.length})
            </h2>
            <span className="text-[10px] text-gray-500 font-mono">PDF / TXT</span>
          </div>

          <div className="border-2 border-dashed border-border/80 hover:border-gray-600 rounded-lg p-4 text-center transition-colors bg-background/30">
            <label className="cursor-pointer block space-y-2">
              <span className="text-xs text-accent font-medium hover:underline block">
                {uploading ? "Uploading..." : "+ Upload PDF / Document"}
              </span>
              <span className="text-[11px] text-gray-500 block">
                Supports offer letters, CPT guidelines, W-4, NDA
              </span>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {documents.length === 0 ? (
            <div className="border border-dashed border-border/40 rounded-lg p-6 text-center">
              <p className="text-xs text-gray-400">
                No documents uploaded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.documentId}
                  className="border border-border bg-background/60 rounded-md p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-gray-200 font-medium truncate max-w-[180px]">
                      {doc.fileName}
                    </p>
                    <StatusBadge status={doc.status} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                    <span>{(doc.size / 1024).toFixed(1)} KB</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Command Center Tabs */}
        <div className="lg:col-span-2 border border-border bg-surface/40 rounded-xl p-6 flex flex-col justify-between space-y-4">
          {/* Tabs Navigation */}
          <div className="flex items-center justify-between border-b border-border pb-3 overflow-x-auto">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("what-true")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "what-true"
                    ? "bg-accent/20 text-accent border border-accent/60"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                What Would Have to Be True?
              </button>
              <button
                onClick={() => setActiveTab("interactive-graph")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "interactive-graph"
                    ? "bg-indigo-950/60 text-indigo-300 border border-indigo-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Interactive Graph
              </button>
              <button
                onClick={() => setActiveTab("critical-path")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "critical-path"
                    ? "bg-primary-950/60 text-primary-300 border border-primary-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Critical Path
              </button>
              <button
                onClick={() => setActiveTab("counterfactual")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "counterfactual"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                What-If Simulator
              </button>
              <button
                onClick={() => setActiveTab("contradictions")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "contradictions"
                    ? "bg-rose-950/60 text-rose-300 border border-rose-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Contradictions ({contradictions.length})
              </button>
              <button
                onClick={() => setActiveTab("adversary")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "adversary"
                    ? "bg-purple-950/60 text-purple-300 border border-purple-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Adversary Audit
              </button>
              <button
                onClick={() => setActiveTab("unknowns")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "unknowns"
                    ? "bg-amber-950/60 text-amber-300 border border-amber-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Unknowns ({unknowns.length})
              </button>
              <button
                onClick={() => setActiveTab("facts")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "facts"
                    ? "bg-blue-950/60 text-blue-300 border border-blue-800/80"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Facts ({facts.length})
              </button>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 min-h-[460px]">
            {!isAnalyzed ? (
              <div className="border border-dashed border-border rounded-lg p-12 text-center bg-background/30 my-6">
                <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-3 text-accent text-sm">
                  ⚡
                </div>
                <h3 className="text-sm font-medium text-gray-200">
                  Ready for Process Reasoning
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Click &ldquo;⚡ Run Process Analysis&rdquo; to execute the pipeline, open the interactive graph, and test counterfactual scenarios.
                </p>
              </div>
            ) : (
              <>
                {/* 1. Hero Tab: What Would Have to Be True? */}
                {activeTab === "what-true" && whatTrue && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/80 p-3.5 rounded-lg border border-border">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-mono text-gray-400">
                          Target Goal
                        </span>
                        <p className="text-xs font-semibold text-white">
                          {whatTrue.target}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-gray-400">Target Date:</label>
                        <input
                          type="date"
                          value={targetDateInput}
                          onChange={(e) => handleTargetDateChange(e.target.value)}
                          className="bg-surface border border-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded p-2">
                        <span className="text-emerald-400 font-bold block text-sm">
                          {whatTrue.satisfiedCount}
                        </span>
                        <span className="text-[10px] text-gray-400">✓ Satisfied</span>
                      </div>
                      <div className="bg-amber-950/30 border border-amber-800/60 rounded p-2">
                        <span className="text-amber-400 font-bold block text-sm">
                          {whatTrue.uncertainCount}
                        </span>
                        <span className="text-[10px] text-gray-400">⚠ Uncertain</span>
                      </div>
                      <div className="bg-rose-950/30 border border-rose-800/60 rounded p-2">
                        <span className="text-rose-400 font-bold block text-sm">
                          {whatTrue.blockedCount}
                        </span>
                        <span className="text-[10px] text-gray-400">🔴 Blocked</span>
                      </div>
                      <div className="bg-purple-950/30 border border-purple-800/60 rounded p-2">
                        <span className="text-purple-400 font-bold block text-sm">
                          {whatTrue.contradictedCount}
                        </span>
                        <span className="text-[10px] text-gray-400">⛔ Contradicted</span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {whatTrue.conditions.map((cond) => {
                        let badgeStyle = "bg-emerald-950/60 text-emerald-300 border-emerald-800";
                        let icon = "✓";
                        if (cond.status === "UNCERTAIN") {
                          badgeStyle = "bg-amber-950/60 text-amber-300 border-amber-800";
                          icon = "⚠";
                        } else if (cond.status === "BLOCKED") {
                          badgeStyle = "bg-rose-950/60 text-rose-300 border-rose-800";
                          icon = "🔴";
                        } else if (cond.status === "CONTRADICTED") {
                          badgeStyle = "bg-purple-950/60 text-purple-300 border-purple-800";
                          icon = "⛔";
                        }

                        return (
                          <div
                            key={cond.id}
                            className="border border-border bg-background/60 rounded-lg p-3 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-gray-200 font-medium">
                                {cond.description}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle}`}
                              >
                                {icon} {cond.status}
                              </span>
                            </div>
                            {cond.suggestedAction && (
                              <p className="text-[11px] text-gray-400 bg-surface/50 p-2 rounded border border-border/40">
                                💡 <span className="text-gray-300">Action:</span>{" "}
                                {cond.suggestedAction}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Interactive Graph Tab (React Flow) */}
                {activeTab === "interactive-graph" && graph && (
                  <InteractiveGraph
                    graph={graph}
                    onInspectElement={handleOpenInspector}
                  />
                )}

                {/* 3. Critical Path Tab */}
                {activeTab === "critical-path" && risk && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Critical Path Schedule
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Tasks on the critical path have zero slack. Total Duration:{" "}
                        <span className="text-white font-mono">
                          {risk.expectedCompletionDays} days
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {risk.criticalPath.map((item, idx) => (
                        <div
                          key={item.nodeId}
                          className="border border-primary-900/60 bg-primary-950/20 rounded-lg p-3 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-primary-800 text-white flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-white">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 block ml-7">
                              Duration: {item.durationDays} days • Day {item.earlyStart} to Day {item.earlyFinish} • Slack: {item.totalFloat} days
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary-900 text-primary-200 uppercase font-semibold">
                            CRITICAL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Counterfactual Simulator Tab */}
                {activeTab === "counterfactual" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Counterfactual &ldquo;What-If&rdquo; Playground
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Simulate the impact of policy changes or expedited tasks without mutating baseline state.
                      </p>
                    </div>

                    <div className="bg-background/80 p-4 rounded-lg border border-border space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-gray-400 block text-[11px]">
                            Select Task:
                          </label>
                          <select
                            value={selectedTaskNode}
                            onChange={(e) => setSelectedTaskNode(e.target.value)}
                            className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                          >
                            <option value="">-- Choose Task --</option>
                            {graph?.nodes
                              .filter((n) => n.type !== "DOCUMENT" && n.type !== "EVIDENCE")
                              .map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-gray-400 block text-[11px]">
                            Adjustment (Days Delta):
                          </label>
                          <select
                            value={selectedTaskDelta}
                            onChange={(e) =>
                              setSelectedTaskDelta(Number(e.target.value))
                            }
                            className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-accent"
                          >
                            <option value="-4">-4 Days (Super Expedited)</option>
                            <option value="-2">-2 Days (Expedited Review)</option>
                            <option value="+2">+2 Days (Minor Delay)</option>
                            <option value="+5">+5 Days (Major University Delay)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleRunCounterfactual}
                        disabled={simulating || !selectedTaskNode}
                        className="w-full py-2 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                      >
                        {simulating
                          ? "Running 5,000 Iteration Scenario..."
                          : "⚡ Evaluate Counterfactual Scenario"}
                      </button>
                    </div>

                    {counterResult && (
                      <div className="border border-indigo-900/60 bg-indigo-950/20 rounded-lg p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                          <span className="font-semibold text-indigo-300">
                            Scenario Simulation Result
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              counterResult.deltaProbability < 0
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : "bg-rose-950 text-rose-300 border border-rose-800"
                            }`}
                          >
                            {counterResult.deltaProbability < 0
                              ? `Risk Reduced by ${(Math.abs(counterResult.deltaProbability) * 100).toFixed(0)}%`
                              : `Risk Increased by ${(counterResult.deltaProbability * 100).toFixed(0)}%`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="bg-background/80 p-2.5 rounded border border-border/40 space-y-1">
                            <span className="text-gray-500 block text-[10px] uppercase font-mono">
                              Baseline Process
                            </span>
                            <p className="text-white font-semibold">
                              {(counterResult.baseline.probabilityOfDeadlineMiss * 100).toFixed(0)}% Miss Risk
                            </p>
                            <p className="text-gray-400 text-[10px]">
                              Expected: {counterResult.baseline.expectedCompletionDate} ({counterResult.baseline.expectedCompletionDays} days)
                            </p>
                          </div>

                          <div className="bg-background/80 p-2.5 rounded border border-border/40 space-y-1">
                            <span className="text-indigo-400 block text-[10px] uppercase font-mono">
                              Scenario Process
                            </span>
                            <p className="text-indigo-200 font-semibold">
                              {(counterResult.scenario.probabilityOfDeadlineMiss * 100).toFixed(0)}% Miss Risk
                            </p>
                            <p className="text-gray-400 text-[10px]">
                              Expected: {counterResult.scenario.expectedCompletionDate} ({counterResult.scenario.expectedCompletionDays} days)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Contradictions & Resolution Center Tab */}
                {activeTab === "contradictions" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Contradiction Resolution Center ({contradictions.length})
                      </h3>
                      <span className="text-[10px] font-mono text-gray-400">
                        {unresolvedContras.length} Unresolved
                      </span>
                    </div>

                    {contradictions.length === 0 ? (
                      <div className="border border-border/50 bg-emerald-950/10 rounded-lg p-8 text-center text-emerald-400 text-xs">
                        ✓ No conflicting policies or deadline contradictions detected.
                      </div>
                    ) : (
                      contradictions.map((contra) => (
                        <div
                          key={contra.id}
                          className={`border rounded-lg p-4 space-y-2 text-xs transition-colors ${
                            contra.status === "RESOLVED"
                              ? "border-emerald-900/60 bg-emerald-950/15"
                              : "border-rose-900/60 bg-rose-950/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white">
                                {contra.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  contra.status === "RESOLVED"
                                    ? "bg-emerald-900 text-emerald-200"
                                    : "bg-rose-900/80 text-rose-200"
                                }`}
                              >
                                {contra.status}
                              </span>
                            </div>

                            {contra.status !== "RESOLVED" && (
                              <button
                                onClick={() => setSelectedContraForResolve(contra)}
                                className="px-3 py-1 rounded bg-accent/90 hover:bg-accent text-gray-950 font-semibold text-[11px] transition-colors"
                              >
                                Resolve Contradiction
                              </button>
                            )}
                          </div>

                          <p className="text-gray-300">{contra.description}</p>

                          {contra.resolution && (
                            <div className="bg-background/80 p-2.5 rounded border border-emerald-800/40 text-[11px] text-emerald-300">
                              <span className="font-bold block text-[10px] uppercase font-mono">
                                Resolution Decision: {contra.resolution.resolution}
                              </span>
                              {contra.resolution.notes && (
                                <p className="text-gray-300 mt-0.5">
                                  {contra.resolution.notes}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px]">
                            <div className="bg-background/80 p-2 rounded border border-border/40">
                              <span className="text-gray-500 block text-[10px] uppercase font-mono">
                                Claim A ({contra.evidenceA.documentName || "Doc 1"}, P{contra.evidenceA.pageNumber})
                              </span>
                              <span className="text-rose-200 mt-0.5 block">
                                {contra.claimA}
                              </span>
                            </div>
                            <div className="bg-background/80 p-2 rounded border border-border/40">
                              <span className="text-gray-500 block text-[10px] uppercase font-mono">
                                Claim B ({contra.evidenceB.documentName || "Doc 2"}, P{contra.evidenceB.pageNumber})
                              </span>
                              <span className="text-rose-200 mt-0.5 block">
                                {contra.claimB}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 6. Adversary Validation Engine Tab */}
                {activeTab === "adversary" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Adversarial Validation Engine
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        The Adversarial Validation Engine stress-tests graph completeness, flags unsupported edges, demo assumptions, and unresolved critical blockers.
                      </p>
                    </div>

                    {!adversaryReport || adversaryReport.findings.length === 0 ? (
                      <div className="border border-border/50 bg-emerald-950/10 rounded-lg p-8 text-center text-emerald-400 text-xs">
                        ✓ Adversarial Validation Engine found no high-severity reasoning flaws or unsupported edges.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {adversaryReport.findings.map((f) => (
                          <div
                            key={f.id}
                            className="border border-purple-900/60 bg-purple-950/20 rounded-lg p-3.5 space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-900 text-purple-200 uppercase font-semibold">
                                  {f.findingType}
                                </span>
                                <span className="font-semibold text-white">
                                  {f.targetLabel}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  f.severity === "CRITICAL"
                                    ? "bg-rose-900 text-rose-200"
                                    : "bg-amber-900 text-amber-200"
                                }`}
                              >
                                {f.severity}
                              </span>
                            </div>
                            <p className="text-gray-300">{f.reason}</p>
                            <div className="bg-background/80 p-2 rounded border border-purple-800/40 text-[11px] text-purple-200">
                              <span className="text-purple-400 font-bold block text-[10px] uppercase font-mono">
                                Adversary Challenge:
                              </span>
                              {f.suggestedChallenge}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Unknowns Tab */}
                {activeTab === "unknowns" && (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {unknowns.map((unk) => (
                      <div
                        key={unk.id}
                        className="border border-amber-900/60 bg-amber-950/20 rounded-lg p-3.5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-300">
                            {unk.question}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {unk.blocking && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                BLOCKING
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/80 text-amber-200 uppercase">
                              {unk.severity}
                            </span>
                          </div>
                        </div>
                        {unk.suggestedAction && (
                          <div className="bg-background/80 p-2 rounded border border-border/40 text-[11px] text-gray-300">
                            <span className="text-gray-500 block text-[10px] uppercase font-mono">
                              Recommended Action
                            </span>
                            {unk.suggestedAction}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 8. Facts Tab */}
                {activeTab === "facts" && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {facts.map((fact) => (
                      <div
                        key={fact.id}
                        onClick={() =>
                          handleOpenInspector({
                            title: "Fact Provenance",
                            claimText: fact.statement,
                            confidence: fact.confidence,
                            evidence: graph?.evidence.filter((e) =>
                              fact.sourceEvidenceIds.includes(e.id)
                            ),
                          })
                        }
                        className="border border-border bg-background/60 hover:bg-surface-hover/60 cursor-pointer rounded-md p-3 flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="text-gray-200 font-medium">
                            {fact.statement}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono">
                            Confidence: {(fact.confidence * 100).toFixed(0)}% • Evidence: {fact.sourceEvidenceIds.length} citations (Click to inspect)
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                          FACT
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>Graph Version: 1.0</span>
            <span>
              Engine: {risk ? "Probabilistic Monte Carlo Active" : "Awaiting Execution"}
            </span>
          </div>
        </div>
      </div>

      {/* Provenance Inspector Modal */}
      <ProvenanceInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        title={inspectorData.title}
        claimText={inspectorData.claimText}
        relationType={inspectorData.relationType}
        confidence={inspectorData.confidence}
        evidence={inspectorData.evidence}
      />

      {/* Contradiction Resolution Modal */}
      {selectedContraForResolve && (
        <ContradictionResolutionModal
          isOpen={true}
          onClose={() => setSelectedContraForResolve(null)}
          contradiction={selectedContraForResolve}
          onResolve={handleResolveContradiction}
        />
      )}
    </div>
  );
}
