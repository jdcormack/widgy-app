"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import { CardDetails } from "@/components/cards/card-details";
import { type OrganizationMember } from "@/app/actions";
import { CornerDownLeftIcon } from "lucide-react";

export interface KanbanCardData {
  _id: Id<"cards">;
  _creationTime: number;
  title: string;
  description: string;
  authorId: string;
  boardId?: Id<"boards">;
  organizationId: string;
  assignedTo?: string;
  status?: string;
  updatedAt?: number;
}

interface KanbanCardProps {
  card: KanbanCardData;
  members?: OrganizationMember[];
  onClick?: () => void;
  isHighlighted?: boolean;
  isDragEnabled?: boolean;
}

export function KanbanCard({
  card,
  members = [],
  onClick,
  isHighlighted,
  isDragEnabled = false,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card._id,
      data: {
        type: "card",
        card,
      },
      disabled: !isDragEnabled,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group cursor-pointer hover:bg-accent/50 transition-colors touch-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isDragging && "opacity-50 ring-2 ring-primary",
        isHighlighted && "ring-2 ring-primary bg-primary/5 animate-pulse",
        isDragEnabled && "cursor-grab active:cursor-grabbing"
      )}
      onClick={onClick}
      {...(isDragEnabled ? { ...attributes, ...listeners } : { tabIndex: 0 })}
    >
      <CardDetails
        card={card}
        members={members}
        showBoardName={false}
        showColumn={false}
        variant="compact"
        trailingContent={
          <Kbd className="opacity-0 group-focus-visible:opacity-100 transition-opacity">
            <CornerDownLeftIcon className="h-3 w-3" />
          </Kbd>
        }
      />
    </Card>
  );
}
