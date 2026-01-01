"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Search, Check, Plus } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "sonner";

interface CardSearchProps {
  feedbackId: Id<"feedback">;
  excludeCardIds: Set<Id<"cards">>;
  onCardLinked: () => void;
}

export function CardSearch({
  feedbackId,
  excludeCardIds,
  onCardLinked,
}: CardSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLinking, setIsLinking] = useState<Id<"cards"> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const results = useQuery(
    api.cards.search,
    debouncedQuery.length > 0 ? { query: debouncedQuery } : "skip"
  );

  const linkCard = useMutation(api.feedback.linkCard);
  const createCard = useMutation(api.cards.create);

  const filteredResults =
    results?.filter((c) => !excludeCardIds.has(c._id)) ?? [];

  const handleLinkCard = async (cardId: Id<"cards">) => {
    setIsLinking(cardId);
    try {
      await linkCard({ feedbackId, cardId });
      onCardLinked();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to link card"
      );
    } finally {
      setIsLinking(null);
    }
  };

  const handleCreateCard = async () => {
    setIsCreating(true);
    try {
      const cardId = await createCard({});
      await linkCard({ feedbackId, cardId });
      onCardLinked();
      // Navigate to the new card to fill in details
      router.push(`/cards/${cardId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create card"
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cards by title or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {debouncedQuery.length > 0 && filteredResults.length === 0 && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            No matching cards found
          </p>
          <Button onClick={handleCreateCard} disabled={isCreating}>
            {isCreating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create New Card
              </>
            )}
          </Button>
        </div>
      )}

      {debouncedQuery.length === 0 && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Search for an existing card or create a new one
          </p>
          <Button onClick={handleCreateCard} disabled={isCreating}>
            {isCreating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create New Card
              </>
            )}
          </Button>
        </div>
      )}

      {filteredResults.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredResults.map((card) => (
            <Card
              key={card._id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleLinkCard(card._id)}
            >
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm truncate">
                    {card.title || "Untitled"}
                  </CardTitle>
                  {card.description && (
                    <CardDescription className="text-xs line-clamp-1">
                      {card.description}
                    </CardDescription>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLinking === card._id}
                >
                  {isLinking === card._id ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
