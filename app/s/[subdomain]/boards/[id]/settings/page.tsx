import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getSubdomainData } from "@/lib/subdomains";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";
import { BoardSettingsForm } from "./_board-settings-form";

export default async function BoardSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>;
}) {
  const { subdomain, id } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Require authentication for settings page
  const { userId, orgId } = await auth();
  const isAuthenticated = !!userId && orgId === subdomainData.organizationId;

  if (!isAuthenticated) {
    redirect(`/s/${subdomain}/boards/${id}`);
  }

  const preloadedBoard = await preloadQuery(api.boards.getById, {
    boardId: id as Id<"boards">,
  });

  return (
    <>
      <PageHeader />
      <PageContainer>
        <div className="w-full max-w-xl mx-auto">
          <BoardSettingsForm preloadedBoard={preloadedBoard} />
        </div>
      </PageContainer>
    </>
  );
}
