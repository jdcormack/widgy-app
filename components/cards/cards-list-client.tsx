"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePaginatedQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import { ChevronRightIcon, CornerDownLeft, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type OrganizationMember } from "@/app/actions";
import { CardDetails } from "./card-details";

const ITEMS_PER_PAGE = 10;
const HIGHLIGHT_DURATION = 2000;

interface CardsListClientProps {
  members: OrganizationMember[];
}

export function CardsListClient({ members }: CardsListClientProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(
    null
  );

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.cards.list,
    {},
    { initialNumItems: ITEMS_PER_PAGE }
  );

  const createCard = useMutation(api.cards.create);

  // Refs for keyboard navigation
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevResultsLengthRef = useRef<number>(0);
  const shouldFocusNewCard = useRef<boolean>(false);

  // Clear highlight after duration
  useEffect(() => {
    if (highlightedCardId) {
      const timer = setTimeout(() => {
        setHighlightedCardId(null);
      }, HIGHLIGHT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [highlightedCardId]);

  const handleCreateCard = useCallback(async () => {
    setIsCreating(true);
    try {
      const cardId = await createCard({});
      setHighlightedCardId(cardId);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create card:", error);
      setIsCreating(false);
    }
  }, [createCard]);

  // Keyboard shortcut: press "C" to create a card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleCreateCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreateCard]);

  const handleCardClick = (cardId: string) => {
    router.push(`/cards/${cardId}`);
  };

  // Handle load more with focus tracking
  const handleLoadMore = useCallback(() => {
    prevResultsLengthRef.current = results.length;
    shouldFocusNewCard.current = true;
    loadMore(ITEMS_PER_PAGE);
  }, [results.length, loadMore]);

  // Focus first new card after load completes
  useEffect(() => {
    if (
      shouldFocusNewCard.current &&
      results.length > prevResultsLengthRef.current
    ) {
      const firstNewIndex = prevResultsLengthRef.current;
      const firstNewCard = results[firstNewIndex];
      if (firstNewCard) {
        cardRefs.current.get(firstNewCard._id)?.focus();
      }
      shouldFocusNewCard.current = false;
    }
  }, [results]);

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Cards</h1>
          <Button onClick={handleCreateCard} disabled={isCreating}>
            Create Card
            {isCreating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Kbd className="ml-2 hidden sm:inline-flex">C</Kbd>
                <PlusIcon className="h-4 w-4 sm:hidden" />
              </>
            )}
          </Button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No cards yet. Create your first card to get started.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-lg mx-auto">
          {results.map((card) => (
            <Card
              key={card._id}
              ref={(el) => {
                if (el) cardRefs.current.set(card._id, el);
              }}
              tabIndex={0}
              className={cn(
                "group cursor-pointer hover:bg-accent/50 transition-all py-4",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                highlightedCardId === card._id &&
                  "ring-2 ring-primary bg-primary/5 animate-pulse"
              )}
              onClick={() => handleCardClick(card._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCardClick(card._id);
                }
              }}
            >
              <CardDetails
                card={card}
                members={members}
                showBoardName={true}
                showColumn={true}
                variant="full"
                trailingContent={
                  <div className="relative w-8 h-5 flex items-center justify-end">
                    <Kbd className="absolute right-0 hidden sm:inline-flex opacity-0 group-focus-visible:opacity-100 transition-opacity">
                      <CornerDownLeft className="h-3 w-3" />
                    </Kbd>
                    <ChevronRightIcon className="absolute right-0 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-0 transition-opacity" />
                  </div>
                }
              />
            </Card>
          ))}
        </div>
      )}

      {status === "CanLoadMore" && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Load More
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
