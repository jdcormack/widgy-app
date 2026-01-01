"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, Circle, Clock } from "lucide-react";
import { toast } from "sonner";

interface LinkedCard {
  _id: Id<"cards">;
  _creationTime: number;
  title: string;
  description: string;
  status?: string;
  boardId?: Id<"boards">;
}

interface LinkedCardsListProps {
  feedbackId: Id<"feedback">;
  cards: LinkedCard[];
  isShipped: boolean;
}

function getStatusIcon(status?: string) {
  switch (status) {
    case "done":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "next_up":
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "done":
      return "Done";
    case "next_up":
      return "Next Up";
    case "someday":
      return "Someday";
    default:
      return status || "Unknown";
  }
}

export function LinkedCardsList({
  feedbackId,
  cards,
  isShipped,
}: LinkedCardsListProps) {
  const unlinkCard = useMutation(api.feedback.unlinkCard);

  const handleUnlink = async (cardId: Id<"cards">) => {
    try {
      await unlinkCard({ feedbackId, cardId });
      toast.success("Card unlinked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unlink card"
      );
    }
  };

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No cards linked yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {cards.map((card) => (
        <Card key={card._id}>
          <CardContent className="flex items-center justify-between gap-4 py-3">
            <Link
              href={`/cards/${card._id}`}
              className="flex items-center gap-3 min-w-0 flex-1 hover:underline"
            >
              {getStatusIcon(card.status)}
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">
                  {card.title || "Untitled"}
                </CardTitle>
                {card.description && (
                  <CardDescription className="text-xs line-clamp-1">
                    {card.description}
                  </CardDescription>
                )}
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">
                {getStatusLabel(card.status)}
              </Badge>
              {!isShipped && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleUnlink(card._id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
