"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  MoreVertical,
  Trash2,
  ArrowLeftFromLine,
  ArrowRightToLine,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ColumnDefinition } from "./kanban-column";
import type { KanbanCardData } from "./kanban-card";
import { CardDetails } from "@/components/cards/card-details";
import { type OrganizationMember } from "@/app/actions";

interface KanbanColumnMobileProps {
  column: ColumnDefinition;
  cards: KanbanCardData[];
  members?: OrganizationMember[];
  onCardClick?: (cardId: string) => void;
  highlightedCardId?: string | null;
  // Custom column actions
  isCustomColumn?: boolean;
  isAuthenticated?: boolean;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function KanbanColumnMobile({
  column,
  cards,
  members = [],
  onCardClick,
  highlightedCardId,
  isCustomColumn = false,
  isAuthenticated = false,
  canMoveLeft = false,
  canMoveRight = false,
  onMoveLeft,
  onMoveRight,
  onDelete,
  isDeleting = false,
}: KanbanColumnMobileProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-muted/50 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 p-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-muted/80 transition-colors rounded -m-1 p-1">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  !isOpen && "-rotate-90"
                )}
              />
              <h3 className="font-semibold text-sm">{column.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {cards.length}
              </Badge>
            </div>
          </CollapsibleTrigger>
          {isCustomColumn && isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onMoveLeft} disabled={!canMoveLeft}>
                  <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                  Move Left
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onMoveRight}
                  disabled={!canMoveRight}
                >
                  <ArrowRightToLine className="h-4 w-4 mr-2" />
                  Move Right
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  disabled={cards.length > 0 || isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {cards.length > 0
                    ? `Delete (${cards.length} cards)`
                    : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2">
            {cards.map((card) => (
              <Card
                key={card._id}
                className={cn(
                  "cursor-pointer hover:bg-accent/50 transition-colors",
                  highlightedCardId === card._id &&
                    "ring-2 ring-primary bg-primary/5 animate-pulse"
                )}
                onClick={() => onCardClick?.(card._id)}
              >
                <CardDetails
                  card={card}
                  members={members}
                  showBoardName={false}
                  showColumn={false}
                  variant="compact"
                />
              </Card>
            ))}

            {cards.length === 0 && (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                No cards
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
