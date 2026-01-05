import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { FeedbackCategoriesForm } from "@/components/feedback/feedback-categories-form";

export default async function ConfigurationPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Require authentication for configuration page
  await requireOrgAuth(subdomainData.organizationId);

  const preloadedCategories = await preloadQuery(
    api.feedbackSettings.getCategoriesForOrg,
    {}
  );

  return (
    <div className="w-full max-w-xl mx-auto">
      <FeedbackCategoriesForm preloadedCategories={preloadedCategories} />
    </div>
  );
}

