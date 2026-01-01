"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Eye, EyeOff, UserMinus, Users } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface BoardWatchersListProps {
  boardId: Id<"boards">;
}

export function BoardWatchersList({ boardId }: BoardWatchersListProps) {
  const { user } = useUser();
  const subscribers = useQuery(api.activity.getBoardSubscribers, { boardId });
  const isSubscribed = useQuery(api.activity.isSubscribedToBoard, { boardId });

  const subscribeToBoard = useMutation(api.activity.subscribeToBoard);
  const unsubscribeFromBoard = useMutation(api.activity.unsubscribeFromBoard);
  const removeBoardWatcher = useMutation(api.activity.removeBoardWatcher);

  if (subscribers === undefined || isSubscribed === undefined) {
    return (
      <div className="flex items-center justify-center py-4">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const handleToggleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribeFromBoard({ boardId });
    } else {
      await subscribeToBoard({ boardId });
    }
  };

  const handleRemoveWatcher = async (userId: string) => {
    await removeBoardWatcher({ boardId, userId });
  };

  // Generate initials from user ID (in a real app, you'd fetch user details)
  const getInitials = (userId: string) => {
    // For now, just use first 2 chars of the userId
    return userId.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {subscribers.length} watcher{subscribers.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Button
          variant={isSubscribed ? "outline" : "default"}
          size="sm"
          onClick={handleToggleSubscription}
        >
          {isSubscribed ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Unwatch
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Watch
            </>
          )}
        </Button>
      </div>

      {subscribers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one is watching this board yet.
        </p>
      ) : (
        <div className="space-y-2">
          {subscribers.map((userId) => (
            <div
              key={userId}
              className="flex items-center justify-between p-2 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(userId)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {userId === user?.id ? "You" : `User ${userId.slice(0, 8)}...`}
                </span>
              </div>
              {userId !== user?.id && (
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
          ))}
        </div>
      )}
    </div>
  );
}

