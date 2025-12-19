import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { CardsListClient } from "@/components/cards";
import { getOrganizationMembers } from "@/app/actions";

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

  return <CardsListClient members={members} />;
}
