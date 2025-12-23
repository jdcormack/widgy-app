import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { FeedbackListClient } from "@/components/feedback";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Get auth status - visibility check happens in client component
  const { userId, orgId } = await auth();
  const isAuthenticated = !!userId && orgId === subdomainData.organizationId;

  const [preloadedFeedback, preloadedSettings, preloadedPendingCount] =
    await Promise.all([
      preloadQuery(api.feedback.list, {
        organizationId: subdomainData.organizationId,
        paginationOpts: { numItems: 20, cursor: null },
      }),
      preloadQuery(api.feedbackSettings.get, {
        organizationId: subdomainData.organizationId,
      }),
      isAuthenticated
        ? preloadQuery(api.feedback.getPendingScreeningCount, {})
        : null,
    ]);

  return (
    <FeedbackListClient
      organizationId={subdomainData.organizationId}
      preloadedFeedback={preloadedFeedback}
      preloadedSettings={preloadedSettings}
      preloadedPendingCount={preloadedPendingCount}
      isAuthenticated={isAuthenticated}
    />
  );
}
