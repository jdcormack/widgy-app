"use client";

import { useState, useEffect } from "react";
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
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
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

export function HomePageDndWrapper({
  organizationId,
  members,
}: HomePageDndWrapperProps) {
  const { isAuthenticated } = useConvexAuth();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const assignToBoard = useMutation(api.cards.assignToBoard);

  const [activeCard, setActiveCard] = useState<CardDetailsData | null>(null);
  const [highlightedBoardId, setHighlightedBoardId] = useState<string | null>(
    null
  );

  // Clear highlight after duration
  useEffect(() => {
    if (highlightedBoardId) {
      const timer = setTimeout(() => {
        setHighlightedBoardId(null);
      }, HIGHLIGHT_DURATION);
      return () => clearTimeout(timer);
    }
  }, [highlightedBoardId]);

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

      try {
        await assignToBoard({ cardId, boardId });
        setHighlightedBoardId(boardId);
      } catch (error) {
        console.error("Failed to assign card to board:", error);
      }
    }
  };

  // On mobile or when not authenticated, render without DnD
  const isDndEnabled = isAuthenticated && !isMobile;

  if (!isDndEnabled) {
    return (
      <div className="flex flex-col lg:flex-row-reverse gap-10 max-w-5xl w-full mx-auto py-5">
        <HomePageBoards organizationId={organizationId} />
        <UnassignedCardsSection members={members} />
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
        />
        <UnassignedCardsSection members={members} isDraggable />
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
