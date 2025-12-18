"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserButton, SignInButton } from "@clerk/nextjs";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export function AuthButtons() {
  return (
    <div>
      <Unauthenticated>
        <div>
          <SignInButton mode="modal">
            <Button variant="outline">Sign in</Button>
          </SignInButton>
        </div>
      </Unauthenticated>
      <Authenticated>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-9 h-9",
            },
          }}
        />
      </Authenticated>
      <AuthLoading>
        <Spinner />
      </AuthLoading>
    </div>
  );
}
