import { notFound } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { FeedbackSettingsForm } from "@/components/feedback";

export default async function FeedbackSettingsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Require authentication for settings page
  await requireOrgAuth(subdomainData.organizationId);

  const preloadedSettings = await preloadQuery(
    api.feedbackSettings.getForOrg,
    {}
  );

  return (
    <div className="w-full max-w-xl mx-auto space-y-8">
      <FeedbackSettingsForm preloadedSettings={preloadedSettings} />
    </div>
  );
}
