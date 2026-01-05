"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BellOff,
  MessageSquare,
  MoveRight,
  Pencil,
  RefreshCw,
  Trash2,
  UserPlus,
  Crown,
  Edit,
  Users,
  Megaphone,
} from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type EventType =
  | "card_status_changed"
  | "card_title_changed"
  | "card_comment_added"
  | "card_deleted"
  | "card_moved_to_board"
  | "card_removed_from_board"
  | "card_assigned"
  | "user_subscribed_to_board"
  | "user_unsubscribed_from_board"
  | "user_muted_card"
  | "user_unmuted_card"
  | "user_added_to_board"
  | "user_added_as_board_editor"
  | "user_removed_as_board_editor"
  | "user_added_as_board_owner"
  | "user_removed_as_board_owner"
  | "board_ownership_transferred"
  | "announcement_created"
  | "announcement_published"
  | "announcement_updated"
  | "announcement_deleted";

interface ActivityEvent {
  _id: Id<"activityEvents">;
  _creationTime: number;
  eventType: EventType;
  actorId: string;
  boardId?: Id<"boards">;
  cardId?: Id<"cards">;
  commentId?: Id<"comments">;
  announcementId?: Id<"announcements">;
  organizationId: string;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    oldStatus?: string;
    newStatus?: string;
    targetUserId?: string;
    cardTitle?: string;
    boardName?: string;
    announcementTitle?: string;
  };
}

interface ActivityItemProps {
  event: ActivityEvent;
  subdomain: string;
}

function getEventIcon(eventType: EventType) {
  switch (eventType) {
    case "card_status_changed":
      return <RefreshCw className="h-4 w-4" />;
    case "card_title_changed":
      return <Pencil className="h-4 w-4" />;
    case "card_comment_added":
      return <MessageSquare className="h-4 w-4" />;
    case "card_deleted":
      return <Trash2 className="h-4 w-4" />;
    case "card_moved_to_board":
      return <MoveRight className="h-4 w-4" />;
    case "card_removed_from_board":
      return <ArrowRight className="h-4 w-4 rotate-180" />;
    case "card_assigned":
      return <UserPlus className="h-4 w-4" />;
    case "user_subscribed_to_board":
    case "user_unmuted_card":
      return <Bell className="h-4 w-4" />;
    case "user_unsubscribed_from_board":
    case "user_muted_card":
      return <BellOff className="h-4 w-4" />;
    case "user_added_to_board":
      return <Users className="h-4 w-4" />;
    case "user_added_as_board_editor":
    case "user_removed_as_board_editor":
      return <Edit className="h-4 w-4" />;
    case "user_added_as_board_owner":
    case "user_removed_as_board_owner":
    case "board_ownership_transferred":
      return <Crown className="h-4 w-4" />;
    case "announcement_created":
    case "announcement_published":
    case "announcement_updated":
    case "announcement_deleted":
      return <Megaphone className="h-4 w-4" />;
    default:
      return <RefreshCw className="h-4 w-4" />;
  }
}

function formatStatus(status: string | undefined): string {
  if (!status) return "unknown";
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ActivityItem({ event, subdomain }: ActivityItemProps) {
  const {
    eventType,
    metadata,
    cardId,
    boardId,
    announcementId,
    _creationTime,
  } = event;

  const timeAgo = formatDistanceToNow(new Date(_creationTime), {
    addSuffix: true,
  });

  const renderContent = () => {
    switch (eventType) {
      case "card_status_changed":
        return (
          <p className="text-sm">
            Status changed from{" "}
            <span className="line-through text-muted-foreground">
              {formatStatus(metadata?.oldStatus)}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {formatStatus(metadata?.newStatus)}
            </span>
            {metadata?.cardTitle && (
              <>
                {" "}
                on{" "}
                <span className="font-medium">
                  {metadata.cardTitle || "Untitled card"}
                </span>
              </>
            )}
          </p>
        );

      case "card_title_changed":
        return (
          <p className="text-sm">
            Title changed from{" "}
            <span className="line-through text-muted-foreground">
              {metadata?.oldValue || "Untitled"}
            </span>{" "}
            to{" "}
            <span className="font-medium text-foreground">
              {metadata?.newValue || "Untitled"}
            </span>
          </p>
        );

      case "card_comment_added":
        return (
          <p className="text-sm">
            New comment on{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "a card"}
            </span>
          </p>
        );

      case "card_deleted":
        return (
          <p className="text-sm">
            Card{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "Untitled"}
            </span>{" "}
            was deleted
          </p>
        );

      case "card_moved_to_board":
        return (
          <p className="text-sm">
            Card{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "Untitled"}
            </span>{" "}
            moved to board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "card_removed_from_board":
        return (
          <p className="text-sm">
            Card{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "Untitled"}
            </span>{" "}
            removed from board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "card_assigned":
        return (
          <p className="text-sm">
            Card{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "Untitled"}
            </span>{" "}
            was assigned
          </p>
        );

      case "user_subscribed_to_board":
        return (
          <p className="text-sm">
            Started watching board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "user_unsubscribed_from_board":
        return (
          <p className="text-sm">
            Stopped watching board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "user_muted_card":
        return (
          <p className="text-sm">
            Muted card{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "Untitled"}
            </span>
          </p>
        );

      case "user_unmuted_card":
        return (
          <p className="text-sm">
            Unmuted card{" "}
            <span className="font-medium">
              {metadata?.cardTitle || "Untitled"}
            </span>
          </p>
        );

      case "user_added_to_board":
        return (
          <p className="text-sm">
            Added to board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "user_added_as_board_editor":
        return (
          <p className="text-sm">
            Added as an editor to board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "user_removed_as_board_editor":
        return (
          <p className="text-sm">
            Removed as an editor from board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "user_added_as_board_owner":
        return (
          <p className="text-sm">
            Added as an owner to board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "user_removed_as_board_owner":
        return (
          <p className="text-sm">
            Removed as an owner from board{" "}
            <span className="font-medium">{metadata?.boardName}</span>
          </p>
        );

      case "board_ownership_transferred":
        return (
          <p className="text-sm">
            Ownership of board{" "}
            <span className="font-medium">{metadata?.boardName}</span>{" "}
            transferred
          </p>
        );

      case "announcement_created":
        return (
          <p className="text-sm">
            Created announcement{" "}
            <span className="font-medium">
              {metadata?.announcementTitle || "Untitled"}
            </span>
          </p>
        );

      case "announcement_published":
        return (
          <p className="text-sm">
            Published announcement{" "}
            <span className="font-medium">
              {metadata?.announcementTitle || "Untitled"}
            </span>
          </p>
        );

      case "announcement_updated":
        return (
          <p className="text-sm">
            Updated announcement{" "}
            <span className="font-medium">
              {metadata?.announcementTitle || "Untitled"}
            </span>
          </p>
        );

      case "announcement_deleted":
        return (
          <p className="text-sm">
            Deleted announcement{" "}
            <span className="font-medium">
              {metadata?.announcementTitle || "Untitled"}
            </span>
          </p>
        );

      default:
        return <p className="text-sm">Activity event</p>;
    }
  };

  const getLink = () => {
    if (eventType === "card_deleted" || eventType === "announcement_deleted") {
      return null; // Can't link to deleted items
    }
    if (announcementId) {
      return `/announcements`;
    }
    if (cardId) {
      return `/cards/${cardId}`;
    }
    if (boardId) {
      return `/boards/${boardId}`;
    }
    return null;
  };

  const link = getLink();
  const content = (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="shrink-0 mt-0.5 text-muted-foreground">
        {getEventIcon(eventType)}
      </div>
      <div className="flex-1 min-w-0">
        {renderContent()}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
