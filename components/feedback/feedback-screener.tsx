"use client";

import { useState } from "react";
import Link from "next/link";
import {
  usePreloadedQuery,
  usePaginatedQuery,
  useMutation,
  type Preloaded,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DuplicateSearch } from "./duplicate-search";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Bug,
  Lightbulb,
  CheckCircle,
  Archive,
  Copy,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

interface FeedbackScreenerProps {
  preloadedPendingFeedback: Preloaded<typeof api.feedback.listPendingScreening>;
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

export function FeedbackScreener({
  preloadedPendingFeedback,
}: FeedbackScreenerProps) {
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] =
    useState<Id<"feedback"> | null>(null);
  const [isProcessing, setIsProcessing] = useState<Id<"feedback"> | null>(null);

  const initialData = usePreloadedQuery(preloadedPendingFeedback);
  const { results, status, loadMore } = usePaginatedQuery(
    api.feedback.listPendingScreening,
    { paginationOpts: { numItems: 20, cursor: null } },
    { initialNumItems: 20 }
  );

  const screenIn = useMutation(api.feedback.screenIn);
  const archive = useMutation(api.feedback.archive);
  const markDuplicate = useMutation(api.feedback.markDuplicate);

  const feedbackItems = results ?? initialData.page;

  const handleScreenIn = async (feedbackId: Id<"feedback">) => {
    setIsProcessing(feedbackId);
    try {
      await screenIn({ feedbackId });
      toast.success("Feedback screened in");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to screen in feedback"
      );
    } finally {
      setIsProcessing(null);
    }
  };

  const handleArchive = async (feedbackId: Id<"feedback">) => {
    setIsProcessing(feedbackId);
    try {
      await archive({ feedbackId });
      toast.success("Feedback archived");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to archive feedback"
      );
    } finally {
      setIsProcessing(null);
    }
  };

  const openDuplicateDialog = (feedbackId: Id<"feedback">) => {
    setSelectedFeedbackId(feedbackId);
    setDuplicateDialogOpen(true);
  };

  const handleMarkDuplicate = async (duplicateOfId: Id<"feedback">) => {
    if (!selectedFeedbackId) return;

    setIsProcessing(selectedFeedbackId);
    try {
      await markDuplicate({
        feedbackId: selectedFeedbackId,
        duplicateOfId,
      });
      toast.success("Feedback marked as duplicate");
      setDuplicateDialogOpen(false);
      setSelectedFeedbackId(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark as duplicate"
      );
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/feedback">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Feedback Screener</h1>
      </div>

      {feedbackItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No feedback to screen. You&apos;re all caught up!</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/feedback">Back to Feedback</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {feedbackItems.map((feedback) => (
            <Card key={feedback._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {feedback.category === "bug" ? (
                      <Badge variant="destructive">
                        <Bug className="h-3 w-3 mr-1" />
                        Bug
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Lightbulb className="h-3 w-3 mr-1" />
                        Feature
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(feedback._creationTime)}
                    </span>
                  </div>
                  {feedback.onBehalfOfEmail && (
                    <span className="text-xs text-muted-foreground">
                      from {feedback.onBehalfOfEmail}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg mt-2">{feedback.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm whitespace-pre-wrap">
                  {feedback.description}
                </CardDescription>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleScreenIn(feedback._id)}
                    disabled={isProcessing === feedback._id}
                  >
                    {isProcessing === feedback._id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Screen In
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchive(feedback._id)}
                    disabled={isProcessing === feedback._id}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDuplicateDialog(feedback._id)}
                    disabled={isProcessing === feedback._id}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Mark Duplicate
                  </Button>
                </div>
              </CardContent>
            </Card>
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

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Duplicate</DialogTitle>
            <DialogDescription>
              Search for the original feedback this is a duplicate of.
            </DialogDescription>
          </DialogHeader>
          <DuplicateSearch
            onSelect={handleMarkDuplicate}
            excludeId={selectedFeedbackId ?? undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
