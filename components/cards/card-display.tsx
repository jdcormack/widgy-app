"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { LayoutGrid, UserIcon } from "lucide-react";
import { Remark } from "react-remark";
import { type OrganizationMember } from "@/app/actions";
import {
  MemberAvatar,
  getMemberDisplayName,
  getAuthorDisplayInfo,
} from "./card-details";
import { CardWatchers } from "@/components/activity";
import type { Id } from "@/convex/_generated/dataModel";

interface Board {
  _id: string;
  name: string;
}

interface Card {
  _id: string;
  title: string;
  description: string;
  boardId?: string;
  assignedTo?: string;
  authorId: string;
}

interface CardDisplayProps {
  card: Card;
  boards: Board[];
  members: OrganizationMember[];
  onEdit: () => void;
}

export function CardDisplay({
  card,
  boards,
  members,
  onEdit,
}: CardDisplayProps) {
  const assignedMember = members.find((m) => m.userId === card.assignedTo);
  const authorInfo = getAuthorDisplayInfo(card.authorId, members);
  const selectedBoard = boards.find((b) => b._id === card.boardId);

  return (
    <div className="space-y-6 bg-amber-50/50 rounded-md p-6">
      <h1 className="text-3xl font-black mt-2">{card.title || "Untitled"}</h1>

      <div className="space-y-2">
        {card.description ? (
          <div className="prose prose-sm max-w-none dark:prose-invert border-t border-b py-4 space-y-2">
            <Remark
              rehypeReactOptions={{
                components: {
                  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
                    <h1 className="font-black text-2xl" {...props} />
                  ),
                  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
                    <h2 className="font-bold text-xl" {...props} />
                  ),
                  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
                    <ul className="list-disc list-inside pl-2" {...props} />
                  ),
                  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
                    <ol className="list-decimal list-inside pl-2" {...props} />
                  ),
                  a: (props: React.HTMLAttributes<HTMLAnchorElement>) => (
                    <a
                      className="text-blue-600 underline hover:text-blue-700 transition-colors"
                      {...props}
                    />
                  ),
                  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
                    <p {...props} />
                  ),
                  em: (props: React.HTMLAttributes<HTMLElement>) => (
                    <em className="italic" {...props} />
                  ),
                },
              }}
            >
              {card.description}
            </Remark>
          </div>
        ) : (
          <p className="text-sm italic">No description</p>
        )}
      </div>

      {/* Assigned To */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foregroud">
          Assigned To
        </h3>
        <div className="flex items-center gap-2">
          {assignedMember ? (
            <>
              <MemberAvatar member={assignedMember} className="h-6 w-6" />
              <span>{getMemberDisplayName(assignedMember)}</span>
            </>
          ) : (
            <>
              <UserIcon className="h-4 w-4 text-muted-foregroud" />
              <span className="text-muted-foregroud">Unassigned</span>
            </>
          )}
        </div>
      </div>

      {/* Created By */}
      <div className="flex items-center gap-2 text-sm text-muted-foregroud">
        <span>Created by</span>
        {authorInfo.isFeedbackUser ? (
          <>
            <span className="text-foreground">{authorInfo.displayName}</span>
            <Badge variant="secondary">Public</Badge>
          </>
        ) : authorInfo.member ? (
          <>
            <MemberAvatar member={authorInfo.member} className="h-6 w-6" />
            <span className="text-foreground">{authorInfo.displayName}</span>
          </>
        ) : (
          <span>Unknown</span>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foregroud">Board</h3>
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-muted-foregroud" />
          {selectedBoard ? (
            <Link
              href={`/boards/${selectedBoard._id}`}
              className="text-primary hover:underline"
            >
              {selectedBoard.name}
            </Link>
          ) : (
            <span className="text-muted-foregroud">No board (untriaged)</span>
          )}
        </div>
      </div>

      {/* Watchers */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foregroud">Watchers</h3>
        <CardWatchers
          cardId={card._id as Id<"cards">}
          boardId={card.boardId as Id<"boards"> | undefined}
        />
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={onEdit}>
          Edit
          <Kbd className="hidden md:inline">E</Kbd>
        </Button>
      </div>
    </div>
  );
}
