"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
}

export function KanbanColumnMobile({
  column,
  cards,
  members = [],
  onCardClick,
  highlightedCardId,
}: KanbanColumnMobileProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-muted/50 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/80 transition-colors">
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
