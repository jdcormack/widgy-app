"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeedbackVoteButton } from "./feedback-vote-button";
import { ChevronRightIcon, CornerDownLeft, Ship } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface FeedbackCardProps {
  feedback: {
    _id: Id<"feedback">;
    _creationTime: number;
    title: string;
    description: string;
    category?: string;
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
    organizationId: string;
  };
  isAuthenticated: boolean;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  return "Just now";
}

export function FeedbackCard({ feedback, isAuthenticated }: FeedbackCardProps) {
  const router = useRouter();

  // Get available categories
  const categories =
    useQuery(api.feedbackSettings.getCategories, {
      organizationId: feedback.organizationId,
    }) ?? [];

  const hasCategory =
    feedback.category && categories.includes(feedback.category);

  const handleClick = () => {
    router.push(`/feedback/${feedback._id}`);
  };

  return (
    <Card
      tabIndex={0}
      className={cn(
        "group cursor-pointer hover:bg-accent/50 transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleClick();
        }
      }}
    >
      <CardContent className="flex items-center justify-between gap-4">
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <FeedbackVoteButton
            feedbackId={feedback._id}
            voteCount={feedback.voteCount}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {hasCategory && (
              <Badge variant="default" className="capitalize shrink-0">
                {feedback.category}
              </Badge>
            )}
            <CardTitle className="text-lg truncate">{feedback.title}</CardTitle>
            {(feedback.releasedAt || feedback.status === "released") && (
              <Badge variant="secondary" className="shrink-0">
                <Ship className="h-3 w-3 mr-1" />
                Released
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs line-clamp-1">
            {feedback.description}
          </CardDescription>
          <CardDescription className="text-xs">
            {formatRelativeTime(feedback._creationTime)}
          </CardDescription>
        </div>

        <div className="relative w-8 h-5 flex items-center justify-end shrink-0">
          <Kbd className="absolute right-0 hidden sm:inline-flex opacity-0 group-focus-visible:opacity-100 transition-opacity">
            <CornerDownLeft className="h-3 w-3" />
          </Kbd>
          <ChevronRightIcon className="absolute right-0 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-0 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}
