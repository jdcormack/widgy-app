"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LayoutGrid, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "../ui/kbd";
import { VisibilityBadge } from "./visibility-badge";

interface PublicBoardsProps {
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

export function PublicBoards({ organizationId }: PublicBoardsProps) {
  const router = useRouter();
  const boards = useQuery(api.boards.listPublicBoards, { organizationId });

  const handleBoardClick = (boardId: string) => {
    router.push(`/boards/${boardId}`);
  };

  if (boards === undefined) {
    return <div className="space-y-6 w-full"></div>;
  }

  return (
    <div className="space-y-6 w-full">
      <header className="flex gap-2 items-center">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-bold leading-4">Boards</h2>
        </div>
      </header>

      {boards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No public boards available.</p>
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
                    <CardTitle className="text-lg leading-4">
                      {board.name}
                    </CardTitle>
                    <VisibilityBadge visibility={board.visibility} />
                  </div>
                  <CardDescription className="text-xs">
                    Updated {formatRelativeTime(board.updatedAt)}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 size-5">
                  <Kbd className="hidden sm:inline-flex opacity-0 group-focus-visible:opacity-100 transition-opacity">
                    <CornerDownLeft className="h-3 w-3" />
                  </Kbd>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
