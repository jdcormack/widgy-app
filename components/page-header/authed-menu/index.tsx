"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { CommandMenu } from "@/components/command-menu";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityButton } from "./activity-button";

export function AuthedMenu() {
  return (
    <div className="w-full">
      <Authenticated>
        <div className="flex justify-between items-center gap-2 ml-10">
          <CommandMenu />

          <div className="flex items-center gap-2">
            <ActivityButton />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </div>
        </div>
      </Authenticated>

      <Unauthenticated>
        <div className="flex justify-end">
          <SignInButton mode="modal">
            <Button variant="outline">Sign in</Button>
          </SignInButton>
        </div>
      </Unauthenticated>

      <AuthLoading>
        <div className="flex justify-between items-center gap-2 ml-10">
          <Skeleton className="hidden sm:block h-9 w-48 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full ml-auto" />
        </div>
      </AuthLoading>
    </div>
  );
}
