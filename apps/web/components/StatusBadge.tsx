import React from "react";
import { ProjectStatus, DocumentStatus } from "@epistemic/shared";

interface StatusBadgeProps {
  status: ProjectStatus | DocumentStatus | "ONLINE" | "OFFLINE";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let colorStyles = "bg-gray-800 text-gray-300 border-gray-700";

  switch (status) {
    case "ONLINE":
    case "PROCESSED":
    case "ANALYZED":
      colorStyles = "bg-emerald-950/60 text-emerald-400 border-emerald-800/80";
      break;
    case "READY_FOR_ANALYSIS":
    case "UPLOADED":
      colorStyles = "bg-blue-950/60 text-blue-400 border-blue-800/80";
      break;
    case "ANALYZING":
    case "PROCESSING":
      colorStyles = "bg-amber-950/60 text-amber-400 border-amber-800/80 animate-pulse";
      break;
    case "FAILED":
    case "OFFLINE":
      colorStyles = "bg-rose-950/60 text-rose-400 border-rose-800/80";
      break;
    case "DRAFT":
    default:
      colorStyles = "bg-slate-800 text-slate-300 border-slate-700";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorStyles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {status}
    </span>
  );
}

