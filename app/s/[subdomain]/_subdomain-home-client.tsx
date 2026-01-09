"use client";

import { Spinner } from "@/components/ui/spinner";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export function SubdomainHomeClient() {
  return (
    <>
      <Unauthenticated>authed</Unauthenticated>
      <Authenticated>authenticated</Authenticated>
      <AuthLoading>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </AuthLoading>
    </>
  );
}
