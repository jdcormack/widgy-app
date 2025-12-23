import { notFound } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { FeedbackScreener } from "@/components/feedback";

export default async function FeedbackScreenerPage({
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

  const preloadedPendingFeedback = await preloadQuery(
    api.feedback.listPendingScreening,
    {
      paginationOpts: { numItems: 20, cursor: null },
    }
  );

  return (
    <div className="w-full max-w-3xl mx-auto">
      <FeedbackScreener preloadedPendingFeedback={preloadedPendingFeedback} />
    </div>
  );
}
