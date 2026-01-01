"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BellOff, BellRing, Eye } from "lucide-react";
import { useUser } from "@clerk/nextjs";

interface CardWatchersProps {
  cardId: Id<"cards">;
  boardId?: Id<"boards">;
}

export function CardWatchers({ cardId, boardId }: CardWatchersProps) {
  const { user } = useUser();
  const watchers = useQuery(api.activity.getCardWatchers, { cardId });
  const isWatching = useQuery(api.activity.isWatchingCard, { cardId });
  const isMuted = useQuery(api.activity.isCardMuted, { cardId });
  const isSubscribedToBoard = useQuery(
    api.activity.isSubscribedToBoard,
    boardId ? { boardId } : "skip"
  );

  const muteCard = useMutation(api.activity.muteCard);
  const unmuteCard = useMutation(api.activity.unmuteCard);

  if (
    watchers === undefined ||
    isWatching === undefined ||
    isMuted === undefined
  ) {
    return (
      <div className="flex items-center gap-2">
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  const handleToggleMute = async () => {
    if (isMuted) {
      await unmuteCard({ cardId });
    } else {
      await muteCard({ cardId });
    }
  };

  // Generate initials from user ID
  const getInitials = (userId: string) => {
    return userId.slice(0, 2).toUpperCase();
  };

  // Limit displayed avatars and show overflow count
  const maxDisplayed = 5;
  const displayedWatchers = watchers.slice(0, maxDisplayed);
  const overflowCount = watchers.length - maxDisplayed;

  return (
    <div className="flex items-center gap-3">
      {/* Stacked avatars */}
      {watchers.length > 0 && (
        <TooltipProvider>
          <div className="flex -space-x-2">
            {displayedWatchers.map((userId) => (
              <Tooltip key={userId}>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(userId)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {userId === user?.id
                      ? "You"
                      : `User ${userId.slice(0, 8)}...`}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            {overflowCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-[10px] bg-muted">
                      +{overflowCount}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {overflowCount} more watcher{overflowCount !== 1 ? "s" : ""}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      )}

      {/* Mute/Unmute button - only show if user is subscribed to the board */}
      {isSubscribedToBoard && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isMuted ? "ghost" : "outline"}
                size="sm"
                onClick={handleToggleMute}
                className="h-8"
              >
                {isMuted ? (
                  <>
                    <BellOff className="h-4 w-4 mr-1 text-muted-foreground" />
                    <span className="hidden sm:inline text-muted-foreground">
                      Muted
                    </span>
                  </>
                ) : (
                  <>
                    <BellRing className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Watching</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isMuted
                  ? "Unmute to receive updates for this card"
                  : "Mute to stop receiving updates"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Show info if not subscribed to board */}
      {!isSubscribedToBoard && boardId && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>Watch board to get updates</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Subscribe to the board in board settings to watch cards</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
