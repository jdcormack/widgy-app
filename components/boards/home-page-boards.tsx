"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  Lock,
  LayoutGrid,
  ChevronRightIcon,
  CornerDownLeft,
  PartyPopperIcon,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { CreateBoardDialog } from "./create-board-dialog";

interface BoardData {
  _id: Id<"boards">;
  name: string;
  visibility: string;
  updatedAt: number;
}

interface DroppableBoardCardProps {
  board: BoardData;
  isDropTarget: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}

function DroppableBoardCard({
  board,
  isDropTarget,
  isHighlighted,
  onClick,
}: DroppableBoardCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: board._id,
    data: {
      type: "board",
      board,
    },
    disabled: !isDropTarget,
  });

  return (
    <Card
      ref={setNodeRef}
      tabIndex={0}
      className={cn(
        "group cursor-pointer hover:bg-accent/50 transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isOver && "ring-2 ring-primary bg-primary/10 scale-[1.02]",
        isHighlighted && "ring-2 ring-green-500 bg-green-500/10 animate-pulse"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onClick();
        }
      }}
    >
      <CardContent className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {isHighlighted ? (
              <PartyPopperIcon className="h-4 w-4 text-green-500 animate-bounce" />
            ) : board.visibility === "public" ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-lg">{board.name}</CardTitle>
            {isHighlighted && (
              <span className="text-xs text-green-600 font-medium">
                Card added!
              </span>
            )}
          </div>
          <CardDescription className="text-xs">
            Updated {formatRelativeTime(board.updatedAt)}
          </CardDescription>
        </div>
        <div className="relative w-8 h-5 flex items-center justify-end">
          <Kbd className="absolute right-0 hidden sm:inline-flex opacity-0 group-focus-visible:opacity-100 transition-opacity">
            <CornerDownLeft className="h-3 w-3" />
          </Kbd>
          <ChevronRightIcon className="absolute right-0 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-0 transition-opacity" />
        </div>
      </CardContent>
    </Card>
  );
}

interface HomePageBoardsProps {
  organizationId: string;
  isDropTarget?: boolean;
  highlightedBoardId?: string | null;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  return "Just now";
}

export function HomePageBoards({
  organizationId,
  isDropTarget = false,
  highlightedBoardId = null,
}: HomePageBoardsProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const boards = useQuery(api.boards.listByOrganization, { organizationId });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleBoardClick = (boardId: string) => {
    router.push(`/boards/${boardId}`);
  };

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  // Keyboard shortcut: press "B" to create a board (desktop only, authenticated only)
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

      if (e.key === "b" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleOpenDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, handleOpenDialog]);

  // Show loading state while auth is being determined or boards are loading
  if (isAuthLoading || boards === undefined) {
    return (
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Boards</h1>
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const emptyStateMessage = isAuthenticated
    ? "No boards yet. Create your first board to get started."
    : "No public boards available.";

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Boards</h1>
        {isAuthenticated && (
          <CreateBoardDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
          />
        )}
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyStateMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {boards.map((board) => (
            <DroppableBoardCard
              key={board._id}
              board={board}
              isDropTarget={isDropTarget}
              isHighlighted={highlightedBoardId === board._id}
              onClick={() => handleBoardClick(board._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
