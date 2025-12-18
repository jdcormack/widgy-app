"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type OrganizationMember } from "@/app/actions";
import type { Id } from "@/convex/_generated/dataModel";
import { ActivityIcon, GlobeIcon, LayoutGridIcon } from "lucide-react";
import type { ReactNode } from "react";

// Status ID to display name mapping
const STATUS_DISPLAY_NAMES: Record<string, string> = {
  someday: "Someday",
  next_up: "Next Up",
  done: "Done",
};

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getInitials(member: OrganizationMember): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  }
  if (member.firstName) {
    return member.firstName[0].toUpperCase();
  }
  if (member.identifier) {
    return member.identifier[0].toUpperCase();
  }
  return "?";
}

export function getMemberDisplayName(member: OrganizationMember): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName} ${member.lastName}`;
  }
  if (member.firstName) {
    return member.firstName;
  }
  return member.identifier;
}

export function getStatusDisplayName(status: string): string {
  return STATUS_DISPLAY_NAMES[status] || status;
}

interface MemberAvatarProps {
  member: OrganizationMember;
  className?: string;
}

export function MemberAvatar({ member, className }: MemberAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {member.imageUrl && (
        <AvatarImage src={member.imageUrl} alt={getMemberDisplayName(member)} />
      )}
      <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
    </Avatar>
  );
}

export interface CardDetailsData {
  _id: Id<"cards">;
  _creationTime: number;
  title: string;
  assignedTo?: string;
  status?: string;
  boardId?: Id<"boards">;
  boardName?: string;
  boardVisibility?: string;
}

interface CardDetailsProps {
  card: CardDetailsData;
  members?: OrganizationMember[];
  showBoardName?: boolean;
  showColumn?: boolean;
  variant?: "compact" | "full";
  trailingContent?: ReactNode;
}

export function CardDetails({
  card,
  members = [],
  showBoardName = false,
  showColumn = false,
  variant = "full",
  trailingContent,
}: CardDetailsProps) {
  const assigneeMember = card.assignedTo
    ? members.find((m) => m.userId === card.assignedTo)
    : undefined;

  const isCompact = variant === "compact";

  const content = (
    <div className={cn("space-y-1", isCompact && "space-y-0.5")}>
      {/* Title */}
      <h3
        className={cn(
          "font-medium capitalize",
          isCompact ? "text-sm" : "text-base"
        )}
      >
        {card.title || "Untitled"}
      </h3>

      {/* Meta info row */}
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground flex-wrap",
          isCompact && "gap-1.5"
        )}
      >
        {/* Board name */}
        {showBoardName &&
          (card.boardId && card.boardName ? (
            <Link
              href={`/boards/${card.boardId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:opacity-80"
            >
              <Badge className="capitalize cursor-pointer">
                <LayoutGridIcon className="h-4 w-4 mr-1" />
                {card.boardName}
                {card.boardVisibility === "public" ? (
                  <GlobeIcon className="h-4 w-4 ml-1.5 text-white" />
                ) : null}
              </Badge>
            </Link>
          ) : (
            <Badge variant="secondary">No board</Badge>
          ))}

        {/* Column/Status */}
        {showColumn && card.status && (
          <Badge variant="outline" className="capitalize">
            <ActivityIcon className="h-4 w-4 mr-1" />{" "}
            {getStatusDisplayName(card.status)}
          </Badge>
        )}

        {/* Assigned to */}
        {assigneeMember && (
          <span className="flex items-center gap-1 normal-case">
            {(showBoardName || showColumn) && (
              <span className="text-muted-foreground">→</span>
            )}
            <MemberAvatar
              member={assigneeMember}
              className={cn(isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
            />
            <span>{getMemberDisplayName(assigneeMember)}</span>
          </span>
        )}

        {/* Creation time */}
        <span>{formatDate(card._creationTime)}</span>
      </div>
    </div>
  );

  return (
    <CardHeader className={cn(isCompact ? "p-3" : "py-0")}>
      {trailingContent ? (
        <div className="flex items-center justify-between">
          {content}
          {trailingContent}
        </div>
      ) : (
        content
      )}
    </CardHeader>
  );
}
