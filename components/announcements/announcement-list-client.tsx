"use client";

import { useState, useCallback, useEffect } from "react";
import {
  usePreloadedQuery,
  usePaginatedQuery,
  type Preloaded,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnnouncementCard } from "./announcement-card";
import { AnnouncementCreateSheet } from "./announcement-create-sheet";
import { AnnouncementEditSheet } from "./announcement-edit-sheet";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Kbd } from "@/components/ui/kbd";
import { Megaphone, PlusIcon } from "lucide-react";

interface AnnouncementListClientProps {
  organizationId: string;
  preloadedAnnouncements: Preloaded<typeof api.announcements.list>;
  isAuthenticated: boolean;
}

export function AnnouncementListClient({
  organizationId,
  preloadedAnnouncements,
  isAuthenticated,
}: AnnouncementListClientProps) {
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);

  const initialData = usePreloadedQuery(preloadedAnnouncements);

  const { results, status, loadMore } = usePaginatedQuery(
    api.announcements.list,
    {
      organizationId,
      paginationOpts: { numItems: 5, cursor: null },
    } as any,
    { initialNumItems: 5 }
  );

  const announcements = results ?? initialData.page;
  const isLoading = status === "LoadingMore";
  const hasMore = !initialData.isDone && !results;

  const handleEdit = useCallback((announcement: any) => {
    setEditingAnnouncement(announcement);
  }, []);

  const handleOpenCreateSheet = useCallback(() => {
    setIsCreateSheetOpen(true);
  }, []);

  // Keyboard shortcut: press "A" to create an announcement
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "a" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleOpenCreateSheet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, handleOpenCreateSheet]);

  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        {isAuthenticated && (
          <AnnouncementCreateSheet
            open={isCreateSheetOpen}
            onOpenChange={setIsCreateSheetOpen}
            trigger={
              <Button>
                Create Announcement
                <Kbd className="ml-2 hidden sm:inline-flex">A</Kbd>
                <PlusIcon className="h-4 w-4 mr-2 hidden max-sm:inline-flex" />
              </Button>
            }
          />
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No announcements yet.</p>
          {isAuthenticated && (
            <p className="text-sm mt-2">
              Create an announcement to get started.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement._id}
                announcement={announcement}
                isAuthenticated={isAuthenticated}
                onEdit={handleEdit}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <Button
                onClick={() => loadMore(5)}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <AnnouncementEditSheet
        open={!!editingAnnouncement}
        onOpenChange={(open) => {
          if (!open) {
            setEditingAnnouncement(null);
          }
        }}
        announcement={editingAnnouncement}
      />
    </div>
  );
}
