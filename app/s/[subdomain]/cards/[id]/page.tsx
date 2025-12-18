import { notFound } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { CardDetailClient } from "@/components/cards";
import { Id } from "@/convex/_generated/dataModel";
import { getOrganizationMembers } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";

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

  const [members, preloadedCard, preloadedBoards] = await Promise.all([
    getOrganizationMembers(),
    preloadQuery(api.cards.getById, { cardId: id as Id<"cards"> }),
    preloadQuery(api.boards.listByOrganization, {
      organizationId: subdomainData.organizationId,
    }),
  ]);

  return (
    <>
      <PageHeader />
      <PageContainer>
        <div className="w-full max-w-3xl mx-auto">
          <CardDetailClient
            preloadedCard={preloadedCard}
            preloadedBoards={preloadedBoards}
            members={members}
          />
        </div>
      </PageContainer>
    </>
  );
}
