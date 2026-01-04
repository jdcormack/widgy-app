"use client";

import { usePreloadedQuery, useQuery } from "convex/react";
import type { Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RoadmapCard } from "./roadmap-card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Spinner } from "@/components/ui/spinner";

interface RoadmapBoardProps {
  organizationId: string;
  preloadedRoadmap: Preloaded<typeof api.feedback.getRoadmap>;
  isAuthenticated: boolean;
}

const COLUMNS = [
  { id: "backlog", name: "Backlog", status: "screened_in", color: "gray" },
  { id: "planned", name: "Planned", status: "work_planned", color: "blue" },
  {
    id: "inProgress",
    name: "In Progress",
    status: "in_progress",
    color: "yellow",
  },
  { id: "released", name: "Released", status: "released", color: "green" },
] as const;

export function RoadmapBoard({
  organizationId,
  preloadedRoadmap,
  isAuthenticated,
}: RoadmapBoardProps) {
  const roadmap = usePreloadedQuery(preloadedRoadmap);
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!roadmap) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roadmap</h1>
      </div>

      <div
        className={`
          ${isMobile ? "overflow-x-auto" : ""}
          ${isMobile ? "pb-4" : ""}
        `}
      >
        <div
          className={`
            grid gap-4
            ${isMobile ? "grid-flow-col auto-cols-[280px]" : "grid-cols-4"}
          `}
        >
          {COLUMNS.map((column) => {
            const feedbackList =
              column.id === "backlog"
                ? roadmap.backlog
                : column.id === "planned"
                  ? roadmap.planned
                  : column.id === "inProgress"
                    ? roadmap.inProgress // This now includes both in_progress and ready_for_release
                    : roadmap.released;

            return (
              <div
                key={column.id}
                className="flex flex-col bg-muted/30 rounded-lg p-4 min-h-[400px]"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-sm">{column.name}</h2>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                    {feedbackList.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto">
                  {feedbackList.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No items
                    </div>
                  ) : (
                    feedbackList.map((feedback) => (
                      <RoadmapCard
                        key={feedback._id}
                        feedback={feedback}
                        isAuthenticated={isAuthenticated}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
