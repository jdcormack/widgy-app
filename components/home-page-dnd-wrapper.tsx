"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useConvexAuth } from "convex/react";
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
} from "@dnd-kit/core";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import {
  CardDetails,
  type CardDetailsData,
} from "@/components/cards/card-details";
import { HomePageBoards } from "@/components/boards/home-page-boards";
import { UnassignedCardsSection } from "@/components/cards/unassigned-cards-section";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type OrganizationMember } from "@/app/actions";

const HIGHLIGHT_DURATION = 2000;

interface HomePageDndWrapperProps {
  organizationId: string;
  members: OrganizationMember[];
}

const UNDO_TOAST_DURATION = 5000;

interface LastAssignment {
  cardId: Id<"cards">;
  boardName: string;
  toastId: string | number;
}

export function HomePageDndWrapper({
  organizationId,
  members,
}: HomePageDndWrapperProps) {
  const { isAuthenticated } = useConvexAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const assignToBoard = useMutation(api.cards.assignToBoard);
  const unassignFromBoard = useMutation(api.cards.unassignFromBoard);

  const [activeCard, setActiveCard] = useState<CardDetailsData | null>(null);
  const [highlightedBoardId, setHighlightedBoardId] = useState<string | null>(
    null
  );
  const [undoneCardId, setUndoneCardId] = useState<string | null>(null);

  // Track last assignment for undo functionality
  const lastAssignmentRef = useRef<LastAssignment | null>(null);

  // Clear board highlight after duration
  useEffect(() => {
    if (highlightedBoardId) {
      const timer = setTimeout(() => {
        setHighlightedBoardId(null);
      }, HIGHLIGHT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [highlightedBoardId]);

  // Clear undone card highlight after duration
  useEffect(() => {
    if (undoneCardId) {
      const timer = setTimeout(() => {
        setUndoneCardId(null);
      }, HIGHLIGHT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [undoneCardId]);

  // Undo handler
  const handleUndo = useCallback(async () => {
    const lastAssignment = lastAssignmentRef.current;
    if (!lastAssignment) return;

    try {
      // Dismiss the toast
      toast.dismiss(lastAssignment.toastId);

      // Unassign the card from the board
      await unassignFromBoard({ cardId: lastAssignment.cardId });

      // Highlight the card in the unassigned section
      setUndoneCardId(lastAssignment.cardId);

      // Clear the last assignment
      lastAssignmentRef.current = null;

      // Clear board highlight if it's still showing
      setHighlightedBoardId(null);
    } catch (error) {
      console.error("Failed to undo card assignment:", error);
      toast.error("Failed to undo");
    }
  }, [unassignFromBoard]);

  // Keyboard shortcut: press "U" to undo when toast is visible
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

      // Only trigger undo if there's an active assignment to undo
      if (
        e.key === "u" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        lastAssignmentRef.current
      ) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, handleUndo]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === "unassigned-card") {
      setActiveCard(activeData.card as CardDetailsData);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !isAuthenticated) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "unassigned-card") return;

    // Check if dropped on a board
    if (overData?.type === "board") {
      const cardId = active.id as Id<"cards">;
      const boardId = over.id as Id<"boards">;
      const boardName = overData.board?.name || "board";

      try {
        await assignToBoard({ cardId, boardId });
        setHighlightedBoardId(boardId);

        // Show toast with undo button
        const toastId = toast.success(`Card added to "${boardName}"`, {
          duration: UNDO_TOAST_DURATION,
          action: {
            label: (
              <span className="inline-flex items-center gap-1.5">
                Undo
                <Kbd>U</Kbd>
              </span>
            ),
            onClick: handleUndo,
          },
          onDismiss: () => {
            // Clear last assignment when toast is dismissed
            if (lastAssignmentRef.current?.toastId === toastId) {
              lastAssignmentRef.current = null;
            }
          },
          onAutoClose: () => {
            // Clear last assignment when toast auto-closes
            if (lastAssignmentRef.current?.toastId === toastId) {
              lastAssignmentRef.current = null;
            }
          },
        });

        // Store the assignment info for undo
        lastAssignmentRef.current = { cardId, boardName, toastId };
      } catch (error) {
        console.error("Failed to assign card to board:", error);
        toast.error("Failed to assign card");
      }
    }
  };

  // On mobile or when not authenticated, render without DnD
  const isDndEnabled = isAuthenticated && !isMobile;

  if (!isDndEnabled) {
    return (
      <div className="flex flex-col lg:flex-row-reverse gap-10 max-w-5xl w-full mx-auto py-5">
        <HomePageBoards organizationId={organizationId} members={members} />
        <UnassignedCardsSection
          members={members}
          organizationId={organizationId}
        />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row-reverse gap-10 max-w-5xl w-full mx-auto py-5">
        <HomePageBoards
          organizationId={organizationId}
          isDropTarget
          highlightedBoardId={highlightedBoardId}
          members={members}
        />
        <UnassignedCardsSection
          members={members}
          organizationId={organizationId}
          isDraggable
          undoneCardId={undoneCardId}
        />
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 opacity-90">
            <Card className="w-full max-w-md">
              <CardDetails
                card={activeCard}
                members={members}
                showBoardName={false}
                showColumn={false}
                variant="compact"
              />
            </Card>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
