"use client";

import { useState, useEffect } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, Lock, Users, LayoutGrid, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Kbd } from "../ui/kbd";
import { CreateBoardDialog } from "./create-board-dialog";

interface AuthedUserBoardsProps {
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

function VisibilityIcon({ visibility }: { visibility: string }) {
  switch (visibility) {
    case "public":
      return <Globe className="h-4 w-4 text-muted-foreground" />;
    case "restricted":
      return <Users className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Lock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function AuthedUserBoards({ organizationId }: AuthedUserBoardsProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const boards = useQuery(api.boards.listByOrganization, { organizationId });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleBoardClick = (boardId: string) => {
    router.push(`/boards/${boardId}`);
  };

  // Keyboard shortcut: 'b' key to open create board dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input, textarea, or contenteditable element
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (
        e.key === "b" &&
        !isInputElement &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show loading state while auth is being determined or boards are loading
  if (isAuthLoading || boards === undefined) {
    return (
      <div className="space-y-6 w-full">
        <h1 className="text-2xl font-bold">Boards</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <header>
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-bold">Boards</h2>
        </div>
        {boards.length > 0 && (
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setIsDialogOpen(true)}
          >
            Create Board <Kbd className="ml-2 hidden sm:inline-flex">b</Kbd>
          </Button>
        )}
      </header>

      <CreateBoardDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      {boards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{emptyStateMessage}</p>
          <Button
            size="sm"
            className="mt-4"
            onClick={() => setIsDialogOpen(true)}
          >
            Create Board <Kbd className="ml-2 hidden sm:inline-flex">b</Kbd>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <VisibilityIcon visibility={board.visibility} />
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Updated {formatRelativeTime(board.updatedAt)}
                  </CardDescription>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
