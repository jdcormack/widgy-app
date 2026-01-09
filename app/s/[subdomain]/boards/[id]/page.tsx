import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "@/convex/_generated/dataModel";
import { getSubdomainData } from "@/lib/subdomains";
import { BoardKanban } from "@/components/boards";
import { getOrganizationMembers } from "@/app/actions";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>;
}) {
  const { subdomain, id } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Get auth status - board visibility check happens in client component
  const { userId, orgId } = await auth();
  const isAuthenticated = !!userId && orgId === subdomainData.organizationId;

  // Fetch members for displaying assignee info
  const members = await getOrganizationMembers();

  return (
    <BoardKanban
      boardId={id as Id<"boards">}
      members={members}
      isAuthenticated={isAuthenticated}
    />
  );
}
