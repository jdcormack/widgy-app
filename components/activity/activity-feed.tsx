"use client";

import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ActivityItem } from "./activity-item";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Bell } from "lucide-react";

interface ActivityFeedProps {
  subdomain: string;
}

export function ActivityFeed({ subdomain }: ActivityFeedProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.activity.getActivityFeed,
    {},
    { initialNumItems: 20 }
  );

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Bell className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground">No activity yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
          Activity from boards and cards you&apos;re watching will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border">
        {results.map((event) => (
          <ActivityItem key={event._id} event={event} subdomain={subdomain} />
        ))}
      </div>

      {status === "CanLoadMore" && (
        <div className="p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => loadMore(20)}
          >
            Load more
          </Button>
        </div>
      )}

      {status === "LoadingMore" && (
        <div className="flex items-center justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

