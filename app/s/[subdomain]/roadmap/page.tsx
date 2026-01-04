import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { RoadmapBoard } from "@/components/feedback/roadmap-board";
import { auth } from "@clerk/nextjs/server";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  const { userId } = await auth();
  const isAuthenticated = !!userId;

  const preloadedRoadmap = await preloadQuery(api.feedback.getRoadmap, {
    organizationId: subdomainData.organizationId,
  });

  return (
    <RoadmapBoard
      organizationId={subdomainData.organizationId}
      preloadedRoadmap={preloadedRoadmap}
      isAuthenticated={isAuthenticated}
    />
  );
}
