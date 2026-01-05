"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Remark } from "react-remark";
import { Pencil, Trash2, Eye, EyeOff, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface Announcement {
  _id: Id<"announcements">;
  _creationTime: number;
  title: string;
  details: string;
  status: "draft" | "published";
  organizationId: string;
  authorId: string;
  publishedAt?: number;
  updatedAt: number;
}

interface AnnouncementCardProps {
  announcement: Announcement;
  isAuthenticated: boolean;
  onEdit?: (announcement: Announcement) => void;
}

export function AnnouncementCard({
  announcement,
  isAuthenticated,
  onEdit,
}: AnnouncementCardProps) {
  const publish = useMutation(api.announcements.publish);
  const unpublish = useMutation(api.announcements.unpublish);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);

  const handlePublish = async () => {
    try {
      await publish({ announcementId: announcement._id });
      toast.success("Announcement published");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to publish announcement"
      );
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublish({ announcementId: announcement._id });
      toast.success("Announcement unpublished");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to unpublish announcement"
      );
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this announcement?")) {
      return;
    }
    try {
      await deleteAnnouncement({ announcementId: announcement._id });
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete announcement"
      );
    }
  };

  const displayDate = announcement.publishedAt
    ? announcement.publishedAt
    : announcement._creationTime;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">{announcement.title}</h2>
            {isAuthenticated && (
              <Badge
                variant={
                  announcement.status === "published" ? "default" : "secondary"
                }
              >
                {announcement.status === "published" ? "Published" : "Draft"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {announcement.status === "published"
              ? `Published ${formatDistanceToNow(new Date(displayDate), {
                  addSuffix: true,
                })}`
              : `Created ${formatDistanceToNow(new Date(displayDate), {
                  addSuffix: true,
                })}`}
          </p>
        </div>
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(announcement)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {announcement.status === "draft" ? (
                <DropdownMenuItem onClick={handlePublish}>
                  <Eye className="h-4 w-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleUnpublish}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Unpublish
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert">
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
          {announcement.details}
        </Remark>
      </div>
    </Card>
  );
}
