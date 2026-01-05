import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { AnnouncementListClient } from "@/components/announcements";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Get auth status
  const { userId, orgId } = await auth();
  const isAuthenticated = !!userId && orgId === subdomainData.organizationId;

  const preloadedAnnouncements = await preloadQuery(api.announcements.list, {
    organizationId: subdomainData.organizationId,
    paginationOpts: { numItems: 5, cursor: null },
  });

  return (
    <AnnouncementListClient
      organizationId={subdomainData.organizationId}
      preloadedAnnouncements={preloadedAnnouncements}
      isAuthenticated={isAuthenticated}
    />
  );
}
