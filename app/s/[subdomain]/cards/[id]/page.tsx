import { notFound } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { CardDetailClient } from "@/components/cards";
import { Id } from "@/convex/_generated/dataModel";
import { getOrganizationMembers, getCurrentUserId } from "@/app/actions";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>;
}) {
  const { subdomain, id } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  await requireOrgAuth(subdomainData.organizationId);

  const cardId = id as Id<"cards">;

  const [
    members,
    currentUserId,
    preloadedCard,
    preloadedBoards,
    preloadedComments,
  ] = await Promise.all([
    getOrganizationMembers(),
    getCurrentUserId(),
    preloadQuery(api.cards.getById, { cardId }),
    preloadQuery(api.boards.listByOrganization, {
      organizationId: subdomainData.organizationId,
    }),
    preloadQuery(api.comments.listByCard, { cardId }),
  ]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <CardDetailClient
        preloadedCard={preloadedCard}
        preloadedBoards={preloadedBoards}
        preloadedComments={preloadedComments}
        members={members}
        currentUserId={currentUserId}
      />
    </div>
  );
}
