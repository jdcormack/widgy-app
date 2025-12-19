"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePaginatedQuery, useMutation, useConvexAuth } from "convex/react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  ChevronRightIcon,
  CornerDownLeft,
  PlusIcon,
  InboxIcon,
  GripVerticalIcon,
  MessageSquarePlusIcon,
  MailIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type OrganizationMember } from "@/app/actions";
import { CardDetails, type CardDetailsData } from "./card-details";

// Feedback form schema with honeypot field
const feedbackFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description must be 5000 characters or less"),
  email: z.string().email("Please enter a valid email"),
  website: z.string().max(0), // Honeypot - must be empty
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

const ITEMS_PER_PAGE = 10;
const HIGHLIGHT_DURATION = 2000;

interface DraggableCardProps {
  card: CardDetailsData;
  members: OrganizationMember[];
  isHighlighted: boolean;
  isUndone: boolean;
  isDraggable: boolean;
  onClick: () => void;
  cardRef: (el: HTMLDivElement | null) => void;
}

function DraggableCard({
  card,
  members,
  isHighlighted,
  isUndone,
  isDraggable,
  onClick,
  cardRef,
}: DraggableCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card._id,
      data: {
        type: "unassigned-card",
        card,
      },
      disabled: !isDraggable,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <Card
      ref={(el) => {
        setNodeRef(el);
        cardRef(el);
      }}
      style={style}
      className={cn(
        "group cursor-pointer hover:bg-accent/50 transition-all py-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isHighlighted && "ring-2 ring-primary bg-primary/5 animate-pulse",
        isUndone &&
          "ring-2 ring-blue-500 bg-blue-500/10 animate-[pulse_0.5s_ease-in-out_3]",
        isDragging && "opacity-50 ring-2 ring-primary",
        isDraggable && "touch-none"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onClick();
        }
      }}
      {...(isDraggable ? { ...attributes, ...listeners } : { tabIndex: 0 })}
    >
      <CardDetails
        card={card}
        members={members}
        showBoardName={false}
        showColumn={true}
        variant="full"
        trailingContent={
          <div className="relative w-8 h-5 flex items-center justify-end">
            {isDraggable ? (
              <GripVerticalIcon className="h-5 w-5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            ) : (
              <>
                <Kbd className="absolute right-0 hidden sm:inline-flex opacity-0 group-focus-visible:opacity-100 transition-opacity">
                  <CornerDownLeft className="h-3 w-3" />
                </Kbd>
                <ChevronRightIcon className="absolute right-0 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-0 transition-opacity" />
              </>
            )}
          </div>
        }
      />
    </Card>
  );
}

interface UnassignedCardsSectionProps {
  members: OrganizationMember[];
  organizationId: string;
  isDraggable?: boolean;
  undoneCardId?: string | null;
}

export function UnassignedCardsSection({
  members,
  organizationId,
  isDraggable = false,
  undoneCardId = null,
}: UnassignedCardsSectionProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(
    null
  );

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.cards.listUnassigned,
    isAuthenticated ? {} : "skip",
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

  // Auto-scroll to undone card when it appears
  useEffect(() => {
    if (undoneCardId) {
      // Small delay to allow the card to render
      const timer = setTimeout(() => {
        const cardEl = cardRefs.current.get(undoneCardId);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
          cardEl.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [undoneCardId]);

  const handleCreateCard = useCallback(async () => {
    setIsCreating(true);
    try {
      // Create card without boardId (unassigned)
      const cardId = await createCard({});
      setHighlightedCardId(cardId);
      shouldFocusNewCard.current = true;
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create card:", error);
      setIsCreating(false);
    }
  }, [createCard]);

  // Keyboard shortcut: press "C" to create a card
  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated, handleCreateCard]);

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

  // Feedback form for unauthenticated users
  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      title: "",
      description: "",
      email: "",
      website: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmitFeedback(values: FeedbackFormValues) {
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, organizationId }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }
      toast.success("Thank you! Your feedback has been submitted.");
      form.reset();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit feedback. Please try again."
      );
    }
  }

  // Show feedback form for unauthenticated users
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Submit Feedback</h2>
        </div>
        <div className="border rounded-lg bg-muted/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquarePlusIcon className="h-6 w-6 text-muted-foreground" />
            <p className="text-muted-foreground">
              Share your ideas, bugs, or feature requests.
            </p>
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitFeedback)}
              className="space-y-4"
            >
              {/* Honeypot field - hidden from real users, bots will fill it */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                  {...form.register("website")}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          placeholder="What's on your mind?"
                          {...field}
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText className="text-xs">
                            {field.value.length}/200
                          </InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupTextarea
                          placeholder="Tell us more about your idea, bug, or feature request..."
                          {...field}
                        />
                        <InputGroupAddon align="block-end">
                          <InputGroupText className="ml-auto text-xs">
                            {field.value.length}/5000
                          </InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupInput
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                        />
                        <InputGroupAddon>
                          <MailIcon />
                        </InputGroupAddon>
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Submit Feedback
              </Button>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  // Show loading state while auth is being determined or first page is loading
  if (isAuthLoading || status === "LoadingFirstPage") {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Unassigned Cards</h2>
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="py-4">
              <div className="px-6 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Unassigned Cards</h2>
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

      {results.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <InboxIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No unassigned cards. Create a card to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((card) => (
            <DraggableCard
              key={card._id}
              card={card}
              members={members}
              isHighlighted={highlightedCardId === card._id}
              isUndone={undoneCardId === card._id}
              isDraggable={isDraggable}
              onClick={() => handleCardClick(card._id)}
              cardRef={(el) => {
                if (el) cardRefs.current.set(card._id, el);
              }}
            />
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
