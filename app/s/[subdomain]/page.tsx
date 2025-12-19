import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { rootDomain } from "@/lib/utils";
import { HomePageBoards } from "@/components/boards";
import { UnassignedCardsSection } from "@/components/cards";
import { getOrganizationMembers } from "@/app/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain,
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: `Subdomain page for ${subdomain}.${rootDomain}`,
  };
}

export default async function SubdomainPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Fetch org members for authenticated users (returns empty array if not authenticated)
  const members = await getOrganizationMembers();

  return (
    <div className="flex flex-col lg:flex-row-reverse gap-10 max-w-5xl w-full mx-auto py-5">
      <HomePageBoards organizationId={subdomainData.organizationId} />
      <UnassignedCardsSection members={members} />
    </div>
  );
}
