"use client";

import { Bell } from "lucide-react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ActivityFeed } from "@/components/activity";

export function ActivityButton() {
  const params = useParams();
  const subdomain = (params?.subdomain as string) ?? "";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Activity feed"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Activity</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto h-[calc(100vh-5rem)]">
          <ActivityFeed subdomain={subdomain} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
