import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { rootDomain } from "@/lib/utils";
import { HomePageDndWrapper } from "@/components/home-page-dnd-wrapper";
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
    <HomePageDndWrapper
      organizationId={subdomainData.organizationId}
      members={members}
    />
  );
}
