"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Globe,
  Lock,
  LayoutGrid,
  ChevronRightIcon,
  CornerDownLeft,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { CreateBoardDialog } from "./create-board-dialog";

interface BoardsGridProps {
  organizationId: string;
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

export function BoardsGrid({ organizationId }: BoardsGridProps) {
  const router = useRouter();
  const boards = useQuery(api.boards.listByOrganization, { organizationId });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleBoardClick = (boardId: string) => {
    router.push(`/boards/${boardId}`);
  };

  const handleOpenDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  // Keyboard shortcut: press "B" to create a board (desktop only)
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

      if (e.key === "b" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleOpenDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenDialog]);

  if (boards === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg w-full mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Boards</h1>
        <CreateBoardDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No boards yet. Create your first board to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {boards.map((board) => (
            <Card
              key={board._id}
              tabIndex={0}
              className={cn(
                "group cursor-pointer hover:bg-accent/50 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              )}
              onClick={() => handleBoardClick(board._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleBoardClick(board._id);
                }
              }}
            >
              <CardContent className="flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    {board.visibility === "public" ? (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    ) : board.visibility === "restricted" ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-lg">{board.name}</CardTitle>
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
          ))}
        </div>
      )}
    </div>
  );
}
