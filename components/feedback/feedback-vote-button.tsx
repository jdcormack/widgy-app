"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FeedbackVoteButtonProps {
  feedbackId: Id<"feedback">;
  voteCount: number;
  isAuthenticated: boolean;
  disabled?: boolean;
}

export function FeedbackVoteButton({
  feedbackId,
  voteCount,
  isAuthenticated,
  disabled = false,
}: FeedbackVoteButtonProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasVoted = useQuery(api.feedback.hasUserVoted, { feedbackId });
  const toggleVote = useMutation(api.feedback.toggleVote);

  const handleVote = async () => {
    if (disabled) {
      return;
    }

    if (isAuthenticated) {
      try {
        await toggleVote({ feedbackId });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update vote"
        );
      }
    } else {
      setEmailDialogOpen(true);
    }
  };

  const handleEmailVote = async () => {
    if (!email) return;

    setIsSubmitting(true);
    try {
      await toggleVote({ feedbackId, email });
      setEmailDialogOpen(false);
      setEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update vote"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant={hasVoted ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex flex-col items-center h-auto py-2 px-3 min-w-[48px]",
          hasVoted && "bg-primary text-primary-foreground"
        )}
        onClick={handleVote}
        disabled={disabled}
      >
        <ChevronUp className="h-4 w-4" />
        <span className="text-xs font-medium">{voteCount}</span>
      </Button>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vote for this feedback</DialogTitle>
            <DialogDescription>
              Enter your email to vote. This helps us track interest and prevent
              duplicate votes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleEmailVote();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailVote} disabled={!email || isSubmitting}>
              {isSubmitting ? <Spinner /> : "Vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
