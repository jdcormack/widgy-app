import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
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
  const { userId, orgId } = await auth();
  const isAuthenticated = !!userId && orgId === subdomainData.organizationId;

  if (!isAuthenticated) {
    redirect(`/s/${subdomain}/feedback`);
  }

  const preloadedSettings = await preloadQuery(
    api.feedbackSettings.getForOrg,
    {}
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <FeedbackSettingsForm preloadedSettings={preloadedSettings} />
    </div>
  );
}
