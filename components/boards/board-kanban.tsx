"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { KanbanColumn, type ColumnDefinition } from "./kanban-column";
import { KanbanColumnMobile } from "./kanban-column-mobile";
import { KanbanCard, type KanbanCardData } from "./kanban-card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { PlusIcon, GlobeIcon, Settings, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMemberDisplayName } from "@/components/cards/card-details";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type OrganizationMember } from "@/app/actions";

const HIGHLIGHT_DURATION = 2000;

// Core columns that are always present
const CORE_COLUMNS: ColumnDefinition[] = [
  { id: "someday", name: "Someday", position: 0 },
  { id: "next_up", name: "Next Up", position: 1 },
  { id: "done", name: "Done", position: 999 }, // High position to always be last
];

interface BoardKanbanProps {
  boardId: Id<"boards">;
  members?: OrganizationMember[];
  isAuthenticated?: boolean;
}

export function BoardKanban({
  boardId,
  members = [],
  isAuthenticated = false,
}: BoardKanbanProps) {
  const router = useRouter();
  const board = useQuery(api.boards.getById, { boardId });
  const cards = useQuery(api.cards.listByBoard, { boardId });
  const owners = useQuery(api.boards.getOwners, { boardId });
  const canEdit = useQuery(api.boards.canEdit, { boardId });
  const updateStatus = useMutation(api.cards.updateStatus);
  const createCard = useMutation(api.cards.create);

  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(
    null
  );
  const [isCreating, setIsCreating] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    if (highlightedCardId) {
      const timer = setTimeout(() => {
        setHighlightedCardId(null);
      }, HIGHLIGHT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [highlightedCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Build columns array with custom columns inserted between next_up and done
  const columns = useMemo(() => {
    const customColumns = board?.customColumns ?? [];
    const sortedCustomColumns = [...customColumns].sort(
      (a, b) => a.position - b.position
    );

    // Find the core columns
    const someday = CORE_COLUMNS[0];
    const nextUp = CORE_COLUMNS[1];
    const done = CORE_COLUMNS[2];

    // Build final column order: someday, next_up, [custom columns], done
    return [
      someday,
      nextUp,
      ...sortedCustomColumns.map((col, idx) => ({
        ...col,
        position: 2 + idx, // Position after next_up
      })),
      done,
    ];
  }, [board?.customColumns]);

  // Group cards by status
  const cardsByColumn = useMemo(() => {
    const grouped: Record<string, KanbanCardData[]> = {};
    columns.forEach((col) => {
      grouped[col.id] = [];
    });

    cards?.forEach((card) => {
      const status = card.status ?? "someday";
      if (grouped[status]) {
        grouped[status].push(card);
      } else {
        // If status doesn't match any column, put in someday
        grouped["someday"]?.push(card);
      }
    });

    return grouped;
  }, [cards, columns]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === "card") {
      setActiveCard(activeData.card as KanbanCardData);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !isAuthenticated) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "card") return;

    const cardId = active.id as Id<"cards">;
    let newStatus: string | undefined;

    // Determine the new status based on where we dropped
    if (overData?.type === "column") {
      // Dropped directly on a column
      newStatus = overData.column.id;
    } else if (overData?.type === "card") {
      // Dropped on another card - use that card's status
      newStatus = overData.card.status;
    } else if (typeof over.id === "string") {
      // Dropped on a column by id
      newStatus = over.id;
    }

    if (newStatus && activeData.card.status !== newStatus) {
      await updateStatus({
        cardId,
        status: newStatus,
      });
    }
  };

  const handleCardClick = (cardId: string) => {
    router.push(`/cards/${cardId}`);
  };

  const handleCreateCard = useCallback(async () => {
    if (!isAuthenticated || !canEdit) return;

    setIsCreating(true);
    try {
      const cardId = await createCard({
        boardId,
        status: "next_up",
      });
      setHighlightedCardId(cardId);
    } catch (error) {
      console.error("Failed to create card:", error);
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, canEdit, createCard, boardId]);

  // Keyboard shortcut: press "C" to create a card
  useEffect(() => {
    if (!isAuthenticated || !canEdit) return;

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
  }, [isAuthenticated, canEdit, handleCreateCard]);

  if (board === undefined || cards === undefined || canEdit === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (board === null) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Board not found or you don&apos;t have access.</p>
      </div>
    );
  }

  // Mobile view with collapsible columns
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black capitalize">{board.name}</h1>
              {board.visibility === "public" && (
                <Tooltip>
                  <TooltipTrigger>
                    <GlobeIcon className="h-4 w-4 text-green-500" />
                  </TooltipTrigger>
                  <TooltipContent>Publicly accessible</TooltipContent>
                </Tooltip>
              )}
              {isAuthenticated && (
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/boards/${boardId}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
            {owners && owners.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Crown className="h-3 w-3" />
                <span>Owned by:</span>
                {owners.map((ownerId, index) => {
                  const owner = members.find((m) => m.userId === ownerId);
                  if (!owner) return null;
                  return (
                    <span key={ownerId} className="flex items-center gap-1">
                      {index > 0 && <span>,</span>}
                      <span className="font-medium text-foreground">
                        {getMemberDisplayName(owner)}
                      </span>
                      {owner.identifier && (
                        <span className="text-muted-foreground">
                          ({owner.identifier})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          {isAuthenticated && canEdit && (
            <Button onClick={handleCreateCard} disabled={isCreating}>
              Create Card
              {isCreating ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {columns.map((column) => (
            <KanbanColumnMobile
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] ?? []}
              members={members}
              onCardClick={handleCardClick}
              highlightedCardId={highlightedCardId}
            />
          ))}
        </div>
      </div>
    );
  }

  // Desktop view with drag and drop
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black capitalize">{board.name}</h1>
            {board.visibility === "public" && (
              <Tooltip>
                <TooltipTrigger>
                  <GlobeIcon className="size-6 text-green-500" />
                </TooltipTrigger>
                <TooltipContent>Board is publicly accessible</TooltipContent>
              </Tooltip>
            )}
          </div>
          {owners && owners.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Crown className="h-4 w-4" />
              <span>Owned by:</span>
              {owners.map((ownerId, index) => {
                const owner = members.find((m) => m.userId === ownerId);
                if (!owner) return null;
                return (
                  <span key={ownerId} className="flex items-center gap-1">
                    {index > 0 && <span>,</span>}
                    <span className="font-medium text-foreground">
                      {getMemberDisplayName(owner)}
                    </span>
                    {owner.identifier && (
                      <span className="text-muted-foreground">
                        ({owner.identifier})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/boards/${boardId}/settings`}>
                <Settings className="size-6" />
              </Link>
            </Button>
            {canEdit && (
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
            )}
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={cardsByColumn[column.id] ?? []}
              members={members}
              onCardClick={handleCardClick}
              isAuthenticated={isAuthenticated}
              highlightedCardId={highlightedCardId}
              draggingFromColumn={activeCard?.status ?? null}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-3 opacity-90">
              <KanbanCard card={activeCard} members={members} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
