"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ScreeningCalloutProps {
  pendingCount: number;
}

export function ScreeningCallout({ pendingCount }: ScreeningCalloutProps) {
  if (pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
        <p className="text-sm">
          <strong>{pendingCount}</strong> feedback item
          {pendingCount === 1 ? "" : "s"} need
          {pendingCount === 1 ? "s" : ""} screening
        </p>
      </div>
      <Link
        href="/feedback/screener"
        className="text-sm font-medium text-primary hover:underline shrink-0"
      >
        Review now
      </Link>
    </div>
  );
}
