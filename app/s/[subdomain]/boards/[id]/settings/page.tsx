import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getSubdomainData } from "@/lib/subdomains";
import { getOrganizationMembers } from "@/app/actions";
import { BoardSettings } from "@/components/boards/board-settings";

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

  const [preloadedBoard, members] = await Promise.all([
    preloadQuery(api.boards.getById, {
      boardId: id as Id<"boards">,
    }),
    getOrganizationMembers(),
  ]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black mt-2 mb-4">Board Settings</h1>
      </div>

      <BoardSettings preloadedBoard={preloadedBoard} members={members} />
    </div>
  );
}
