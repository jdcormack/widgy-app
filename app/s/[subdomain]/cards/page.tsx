import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { CardsListClient } from "@/components/cards";
import { getOrganizationMembers } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";

export default async function CardsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  await requireOrgAuth(subdomainData.organizationId);

  const members = await getOrganizationMembers();

  return (
    <>
      <PageHeader />
      <PageContainer>
        <CardsListClient members={members} />
      </PageContainer>
    </>
  );
}
