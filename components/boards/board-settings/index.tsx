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

interface BoardSettingsProps {
  preloadedBoard: Preloaded<typeof api.boards.getById>;
  members: OrganizationMember[];
}

export function BoardSettings({ preloadedBoard, members }: BoardSettingsProps) {
  const board = usePreloadedQuery(preloadedBoard);

  if (board === null) {
    return (
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>

        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-32" />
        </div>
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
