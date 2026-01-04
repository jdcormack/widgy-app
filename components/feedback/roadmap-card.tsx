"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeedbackVoteButton } from "./feedback-vote-button";
import { Bug, Lightbulb, Ship, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface RoadmapCardProps {
  feedback: {
    _id: Id<"feedback">;
    _creationTime: number;
    title: string;
    description: string;
    category: "bug" | "feature";
    status:
      | "pending_screening"
      | "screened_in"
      | "archived"
      | "duplicate"
      | "work_planned"
      | "in_progress"
      | "ready_for_release"
      | "released";
    voteCount: number;
    releasedAt?: number;
  };
  isAuthenticated: boolean;
}

export function RoadmapCard({ feedback, isAuthenticated }: RoadmapCardProps) {
  const isReleased = feedback.status === "released" || !!feedback.releasedAt;
  const isReadyForRelease = feedback.status === "ready_for_release";

  return (
    <Link href={`/feedback/${feedback._id}`} className="block">
      <Card
        tabIndex={0}
        className={cn(
          "cursor-pointer hover:bg-accent/50 transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isReadyForRelease && "border-purple-500 border-2"
        )}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {feedback.category === "bug" ? (
                <Bug className="h-4 w-4 text-red-500 shrink-0" />
              ) : (
                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
              )}
              <CardTitle className="text-sm font-medium truncate">
                {feedback.title}
              </CardTitle>
              {isReadyForRelease && (
                <Badge
                  variant="outline"
                  className="shrink-0 text-xs border-purple-500 text-purple-700 dark:text-purple-400"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ready
                </Badge>
              )}
              {isReleased && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  <Ship className="h-3 w-3 mr-1" />
                  Released
                </Badge>
              )}
            </div>
          </div>

          <CardDescription className="text-xs line-clamp-2">
            {feedback.description}
          </CardDescription>

          <div
            className="flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <FeedbackVoteButton
              feedbackId={feedback._id}
              voteCount={feedback.voteCount}
              isAuthenticated={isAuthenticated}
              disabled={isReleased}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
