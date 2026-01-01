"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { OrganizationMember } from "@/app/actions";
import { FeedbackVoteButton } from "./feedback-vote-button";
import { LinkedCardsList } from "./linked-cards-list";
import { CardSearch } from "./card-search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Bug,
  Lightbulb,
  ArrowLeft,
  Ship,
  Link as LinkIcon,
  Plus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface FeedbackDetailClientProps {
  feedbackId: Id<"feedback">;
  preloadedFeedback: Preloaded<typeof api.feedback.getById>;
  preloadedLinkedCards: Preloaded<typeof api.feedback.getLinkedCards> | null;
  preloadedBoards: Preloaded<typeof api.boards.listByOrganization> | null;
  members: OrganizationMember[];
  currentUserId: string;
  isAuthenticated: boolean;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(timestamp));
}

export function FeedbackDetailClient({
  feedbackId,
  preloadedFeedback,
  preloadedLinkedCards,
  preloadedBoards,
  members,
  currentUserId,
  isAuthenticated,
}: FeedbackDetailClientProps) {
  const router = useRouter();
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [isShipping, setIsShipping] = useState(false);

  const feedback = usePreloadedQuery(preloadedFeedback);
  const linkedCards = preloadedLinkedCards
    ? usePreloadedQuery(preloadedLinkedCards)
    : [];
  const boards = preloadedBoards ? usePreloadedQuery(preloadedBoards) : [];

  const ship = useMutation(api.feedback.ship);

  // Keyboard shortcut: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        router.back();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleShip = async () => {
    setIsShipping(true);
    try {
      await ship({ feedbackId });
      toast.success("Feedback marked as shipped!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to ship feedback"
      );
    } finally {
      setIsShipping(false);
    }
  };

  // Get IDs of already linked cards
  const linkedCardIds = new Set(linkedCards.map((c) => c._id));

  // Check if all linked cards are done
  const allCardsDone =
    linkedCards.length > 0 && linkedCards.every((c) => c.status === "done");

  if (feedback === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
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
          {feedback.shippedAt && (
            <Badge variant="default">
              <Ship className="h-3 w-3 mr-1" />
              Shipped
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="shrink-0">
          <FeedbackVoteButton
            feedbackId={feedbackId}
            voteCount={feedback.voteCount}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{feedback.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted {formatDate(feedback._creationTime)}
              {feedback.onBehalfOfEmail && (
                <span> by {feedback.onBehalfOfEmail}</span>
              )}
            </p>
            {feedback.shippedAt && (
              <p className="text-sm text-green-600 mt-1">
                Shipped on {formatDate(feedback.shippedAt)}
              </p>
            )}
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{feedback.description}</p>
          </div>

          {feedback.duplicateOfId && (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="flex items-center gap-2 py-3">
                <LinkIcon className="h-4 w-4 text-yellow-600" />
                <span className="text-sm">
                  This feedback is marked as a duplicate.
                </span>
                <Link
                  href={`/feedback/${feedback.duplicateOfId}`}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  View original
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isAuthenticated && feedback.status === "screened_in" && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Linked Cards</CardTitle>
              <div className="flex gap-2">
                {!feedback.shippedAt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLinkDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Link Card
                  </Button>
                )}
                {!feedback.shippedAt && allCardsDone && (
                  <Button size="sm" onClick={handleShip} disabled={isShipping}>
                    {isShipping ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <>
                        <Ship className="h-4 w-4 mr-2" />
                        Mark as Shipped
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <LinkedCardsList
                feedbackId={feedbackId}
                cards={linkedCards}
                isShipped={!!feedback.shippedAt}
              />
            </CardContent>
          </Card>

          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link a Card</DialogTitle>
                <DialogDescription>
                  Search for an existing card or create a new one.
                </DialogDescription>
              </DialogHeader>
              <CardSearch
                feedbackId={feedbackId}
                excludeCardIds={linkedCardIds}
                onCardLinked={() => setLinkDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
