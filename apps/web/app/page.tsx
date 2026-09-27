"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@epistemic/shared";
import { api, ApiClientError } from "../lib/api/client";
import { StatusBadge } from "../components/StatusBadge";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listProjects()
      .then((data) => {
        if (active) {
          setProjects(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : "Failed to load projects"
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="border border-border bg-surface/50 rounded-xl p-8 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 text-xs text-accent uppercase tracking-widest font-mono">
            <span>Context Zero Engine</span>
            <span>/</span>
            <span>Process Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Epistemic Process Reasoning
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Convert fragmented real-world instructions, documents, and onboarding
            workflows into an explicit graph of facts, obligations, deadlines, and
            dependencies.
          </p>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Active Processes</h2>
            <p className="text-xs text-gray-400">
              Structured process models managed by Epistemic Engine
            </p>
          </div>
          <Link
            href="/new"
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          >
            + Create Process
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="border border-border bg-surface/30 rounded-lg p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-gray-400">Loading process models...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="border border-rose-900/50 bg-rose-950/20 rounded-lg p-6 text-center text-rose-300">
            <p className="text-sm font-semibold">Unable to reach backend API</p>
            <p className="text-xs text-rose-400/80 mt-1">{error}</p>
            <p className="text-xs text-gray-400 mt-4">
              Ensure the API server is running on port 3001.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="border border-dashed border-border bg-surface/20 rounded-lg p-12 text-center">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-3 text-gray-400">
              📁
            </div>
            <h3 className="text-sm font-medium text-gray-200">No processes created yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Get started by creating your first process model (such as Internship Onboarding).
            </p>
            <div className="mt-4">
              <Link
                href="/new"
                className="inline-flex items-center px-4 py-2 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors"
              >
                Create First Process
              </Link>
            </div>
          </div>
        )}

        {/* Success List */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                className="group border border-border hover:border-gray-600 bg-surface/40 hover:bg-surface-hover/50 rounded-lg p-5 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-500">
                      {proj.processType}
                    </span>
                    <StatusBadge status={proj.status} />
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-accent transition-colors">
                    {proj.name}
                  </h3>
                  {proj.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-gray-400">
                  <span>{proj.documentCount} document(s)</span>
                  <span className="font-mono text-gray-500">
                    {new Date(proj.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

