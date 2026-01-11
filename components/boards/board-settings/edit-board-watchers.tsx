"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus, UserMinus, Eye, EyeOff } from "lucide-react";
import { type OrganizationMember } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getMemberDisplayName } from "@/components/cards/card-details";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Spinnaker } from "next/font/google";
import { Spinner } from "@/components/ui/spinner";

interface EditBoardWatchersProps {
  boardId: Id<"boards">;
  members: OrganizationMember[];
}

export function EditBoardWatchers({
  boardId,
  members,
}: EditBoardWatchersProps) {
  const { user } = useUser();
  const [watcherSelectorOpen, setWatcherSelectorOpen] = useState(false);

  const canEdit = useQuery(api.boards.canEdit, { boardId });
  const watchers = useQuery(api.activity.getBoardSubscribers, { boardId });
  const isSubscribed = useQuery(api.activity.isSubscribedToBoard, { boardId });

  const addBoardWatcher = useMutation(api.activity.addBoardWatcher);
  const removeBoardWatcher = useMutation(api.activity.removeBoardWatcher);
  const subscribeToBoard = useMutation(api.activity.subscribeToBoard);
  const unsubscribeFromBoard = useMutation(api.activity.unsubscribeFromBoard);

  const handleAddWatcher = async (userId: string) => {
    try {
      await addBoardWatcher({ boardId, userId });
      setWatcherSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add watcher:", error);
    }
  };

  const handleRemoveWatcher = async (userId: string) => {
    try {
      await removeBoardWatcher({ boardId, userId });
    } catch (error) {
      console.error("Failed to remove watcher:", error);
    }
  };

  const handleToggleSubscription = async () => {
    try {
      if (isSubscribed) {
        await unsubscribeFromBoard({ boardId });
      } else {
        await subscribeToBoard({ boardId });
      }
    } catch (error) {
      console.error("Failed to toggle subscription:", error);
    }
  };

  if (
    canEdit === undefined ||
    watchers === undefined ||
    isSubscribed === undefined
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Watchers
        </CardTitle>
        <CardDescription>
          Users watching this board will be automatically subscribed to new
          cards and receive activity updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {watchers.length} watcher{watchers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Popover
                open={watcherSelectorOpen}
                onOpenChange={setWatcherSelectorOpen}
              >
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add watcher
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search members..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {members
                          .filter((m) => !watchers.includes(m.userId))
                          .map((member) => (
                            <CommandItem
                              key={member.userId}
                              onSelect={() => handleAddWatcher(member.userId)}
                            >
                              <Avatar className="mr-2 h-6 w-6">
                                <AvatarImage
                                  src={member.imageUrl ?? undefined}
                                />
                                <AvatarFallback>
                                  {getMemberDisplayName(member)
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              {getMemberDisplayName(member)}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
        {watchers.length > 0 ? (
          <div className="space-y-2">
            {watchers.map((userId) => {
              const member = members.find((m) => m.userId === userId);
              if (!member) return null;
              const isCurrentUser = userId === user?.id;
              return (
                <div
                  key={userId}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.imageUrl ?? undefined} />
                      <AvatarFallback>
                        {getMemberDisplayName(member)
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {getMemberDisplayName(member)}
                      </span>
                      {isCurrentUser && <Badge variant="secondary">You</Badge>}
                    </div>
                  </div>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveWatcher(userId)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No one is watching this board yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
