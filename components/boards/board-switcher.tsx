"use client";

import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { CreateBoardDialog } from "./create-board-dialog";
import { ChevronDown, Globe, Lock, Plus } from "lucide-react";
import { Authenticated } from "convex/react";

interface BoardSwitcherProps {
  organizationId: string;
}

export function BoardSwitcher({ organizationId }: BoardSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentBoardId = searchParams.get("board");

  const boards = useQuery(api.boards.listByOrganization, { organizationId });

  const currentBoard = boards?.find((board) => board._id === currentBoardId);

  const handleBoardSelect = (boardId: Id<"boards">) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("board", boardId);
    router.push(`?${params.toString()}`);
  };

  const handleBoardCreated = (boardId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("board", boardId);
    router.push(`?${params.toString()}`);
  };

  if (boards === undefined) {
    return (
      <Button variant="outline" disabled>
        <span className="animate-pulse">Loading boards...</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild title="Open board switcher">
          <Button variant="outline" className="min-w-[200px] justify-between">
            <span className="flex items-center gap-2 truncate">
              {currentBoard ? (
                <>
                  {currentBoard.visibility === "public" ? (
                    <Globe className="size-4 text-muted-foreground" />
                  ) : (
                    <Lock className="size-4 text-muted-foreground" />
                  )}
                  {currentBoard.name}
                </>
              ) : (
                "Select a board"
              )}
            </span>
            <ChevronDown className="size-4 ml-2 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {boards.length > 0 ? (
            <>
              <DropdownMenuLabel>Boards</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {boards.map((board) => (
                <DropdownMenuItem
                  key={board._id}
                  onClick={() => handleBoardSelect(board._id)}
                  className="flex items-center gap-2"
                >
                  {board.visibility === "public" ? (
                    <Globe className="size-4 text-muted-foreground" />
                  ) : (
                    <Lock className="size-4 text-muted-foreground" />
                  )}
                  <span className="truncate">{board.name}</span>
                </DropdownMenuItem>
              ))}
            </>
          ) : (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No boards yet
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Authenticated>
        <CreateBoardDialog
          organizationId={organizationId}
          onBoardCreated={handleBoardCreated}
        />
      </Authenticated>
    </div>
  );
}
