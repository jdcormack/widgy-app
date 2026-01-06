import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { UsersClient } from "./_users-client";

export default async function UsersPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Require authentication for users page
  await requireOrgAuth(subdomainData.organizationId);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <UsersClient />
    </div>
  );
}

