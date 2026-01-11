"use client";

import { usePreloadedQuery, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type OrganizationMember } from "@/app/actions";
import { EditBoardDetails } from "./edit-board-details";
import { EditBoardMembers } from "./edit-board-members";
import { EditBoardWatchers } from "./edit-board-watchers";
import { DeleteBoard } from "./delete-board";
import { Spinner } from "@/components/ui/spinner";

interface BoardSettingsProps {
  preloadedBoard: Preloaded<typeof api.boards.getById>;
  members: OrganizationMember[];
}

export function BoardSettings({ preloadedBoard, members }: BoardSettingsProps) {
  const board = usePreloadedQuery(preloadedBoard);

  if (board === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <EditBoardDetails
        boardId={board._id}
        board={{ name: board.name, visibility: board.visibility }}
      />

      <EditBoardMembers
        boardId={board._id}
        boardVisibility={board.visibility}
        members={members}
      />

      <EditBoardWatchers boardId={board._id} members={members} />

      <DeleteBoard boardId={board._id} boardName={board.name} />
    </>
  );
}
