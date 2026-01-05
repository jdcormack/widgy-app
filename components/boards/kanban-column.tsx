"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard, type KanbanCardData } from "./kanban-card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Trash2,
  ArrowLeftFromLine,
  ArrowRightToLine,
} from "lucide-react";
import { type OrganizationMember } from "@/app/actions";

export interface ColumnDefinition {
  id: string;
  name: string;
  position: number;
}

interface KanbanColumnProps {
  column: ColumnDefinition;
  cards: KanbanCardData[];
  members?: OrganizationMember[];
  onCardClick?: (cardId: string) => void;
  isAuthenticated?: boolean;
  highlightedCardId?: string | null;
  draggingFromColumn?: string | null;
  // Custom column actions
  isCustomColumn?: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function KanbanColumn({
  column,
  cards,
  members = [],
  onCardClick,
  isAuthenticated = false,
  highlightedCardId,
  draggingFromColumn,
  isCustomColumn = false,
  canMoveLeft = false,
  canMoveRight = false,
  onMoveLeft,
  onMoveRight,
  onDelete,
  isDeleting = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  // Determine if we should blur cards in this column
  const isDragging =
    draggingFromColumn !== null && draggingFromColumn !== undefined;
  const isSourceColumn = column.id === draggingFromColumn;
  const shouldBlurCards = isDragging && !isSourceColumn;
  const isDropTarget = isDragging && !isSourceColumn;

  // Column-specific ring colors for drop target outline
  const getColumnRingColor = () => {
    switch (column.id) {
      case "someday":
        return "ring-gray-400/60 dark:ring-gray-500/60";
      case "next_up":
        return "ring-blue-500/60 dark:ring-blue-400/60";
      case "done":
        return "ring-green-500/60 dark:ring-green-400/60";
      default:
        return "ring-purple-500/60 dark:ring-purple-400/60"; // Custom columns
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-muted/50 rounded-lg p-3 min-h-[500px] flex-1 min-w-0 transition-all duration-200",
        isOver && !isDropTarget && "bg-accent/50 ring-2 ring-primary/20",
        isDropTarget && "ring-2",
        isDropTarget && getColumnRingColor(),
        isDropTarget && isOver && "ring-4 bg-accent/30"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-sm">{column.name}</h3>
        <Badge variant="secondary" className="text-xs">
          {cards.length}
        </Badge>
        {isCustomColumn && isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onMoveLeft} disabled={!canMoveLeft}>
                <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                Move Left
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveRight} disabled={!canMoveRight}>
                <ArrowRightToLine className="h-4 w-4 mr-2" />
                Move Right
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                disabled={cards.length > 0 || isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {cards.length > 0 ? `Delete (${cards.length} cards)` : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 min-h-[100px] transition-all duration-200",
          shouldBlurCards &&
            "[&>div]:blur-[2px] [&>div]:opacity-40 [&>div]:scale-[0.98] [&>div]:transition-all [&>div]:duration-200"
        )}
      >
        {cards.map((card) => (
          <KanbanCard
            key={card._id}
            card={card}
            members={members}
            onClick={() => onCardClick?.(card._id)}
            isHighlighted={highlightedCardId === card._id}
            isDragEnabled={isAuthenticated}
          />
        ))}

        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            No cards
          </div>
        )}
      </div>
    </div>
  );
}
