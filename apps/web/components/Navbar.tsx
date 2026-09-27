"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api/client";
import { StatusBadge } from "./StatusBadge";

export function Navbar() {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getHealth()
      .then((res) => {
        if (mounted) setApiOnline(res.status === "ok");
      })
      .catch(() => {
        if (mounted) setApiOnline(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="h-3.5 w-3.5 rounded-sm bg-accent rotate-45 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
            <span className="font-semibold text-lg tracking-tight text-white">
              EPISTEMIC ENGINE
            </span>
          </Link>
          <span className="text-xs text-gray-400 border border-gray-800 rounded px-2 py-0.5 bg-gray-900/50">
            Phase 1 Foundation
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>API Status:</span>
            {apiOnline === null ? (
              <span className="text-gray-500">Checking...</span>
            ) : (
              <StatusBadge status={apiOnline ? "ONLINE" : "OFFLINE"} />
            )}
          </div>
          <Link
            href="/new"
            className="inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-500 text-white transition-colors shadow-sm"
          >
            + New Process
          </Link>
        </div>
      </div>
    </header>
  );
}

