"use client";

import { Spinner } from "@/components/ui/spinner";
import { AuthedUserBoards } from "@/components/boards";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

interface SubdomainHomeClientProps {
  organizationId: string;
}

export function SubdomainHomeClient({
  organizationId,
}: SubdomainHomeClientProps) {
  return (
    <>
      <Unauthenticated>
        <p>see nothing</p>
      </Unauthenticated>
      <Authenticated>
        <AuthedUserBoards organizationId={organizationId} />
      </Authenticated>
      <AuthLoading>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </AuthLoading>
    </>
  );
}
