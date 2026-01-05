"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  usePreloadedQuery,
  usePaginatedQuery,
  type Preloaded,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { FeedbackCard } from "./feedback-card";
import { FeedbackCreateDialog } from "./feedback-create-dialog";
import { ScreeningCallout } from "./screening-callout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MessageSquare, Settings, Cog } from "lucide-react";

interface FeedbackListClientProps {
  organizationId: string;
  preloadedFeedback: Preloaded<typeof api.feedback.list>;
  preloadedSettings: Preloaded<typeof api.feedbackSettings.get>;
  preloadedPendingCount: Preloaded<
    typeof api.feedback.getPendingScreeningCount
  > | null;
  isAuthenticated: boolean;
}

export function FeedbackListClient({
  organizationId,
  preloadedFeedback,
  preloadedSettings,
  preloadedPendingCount,
  isAuthenticated,
}: FeedbackListClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const initialData = usePreloadedQuery(preloadedFeedback);
  const settings = usePreloadedQuery(preloadedSettings);
  const pendingCount = preloadedPendingCount
    ? usePreloadedQuery(preloadedPendingCount)
    : 0;

  const { results, status, loadMore } = usePaginatedQuery(
    api.feedback.list,
    { organizationId, paginationOpts: { numItems: 20, cursor: null } },
    { initialNumItems: 20 }
  );

  const feedbackItems = results ?? initialData.page;

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  // Keyboard shortcut: press "F" to create feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleOpenDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenDialog]);

  if (settings.visibility === "private" && !isAuthenticated) {
    return (
      <div className="max-w-lg w-full mx-auto space-y-6">
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>This feedback board is private.</p>
          <p className="text-sm mt-2">Sign in to view and submit feedback.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg w-full mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feedback</h1>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/feedback/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild title="Configuration">
                <Link href="/configuration">
                  <Cog className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
          <FeedbackCreateDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            organizationId={organizationId}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>

      {isAuthenticated && <ScreeningCallout pendingCount={pendingCount} />}

      {feedbackItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No feedback yet. Be the first to share your ideas!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {feedbackItems.map((feedback) => (
            <FeedbackCard
              key={feedback._id}
              feedback={feedback}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {status === "CanLoadMore" && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => loadMore(20)}>
            Load more
          </Button>
        </div>
      )}

      {status === "LoadingMore" && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}
    </div>
  );
}
