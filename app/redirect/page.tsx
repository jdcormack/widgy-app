import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { protocol, rootDomain } from "@/lib/utils";
import { getOrganizationById } from "@/lib/organizations";

export default async function RedirectPage() {
  const { userId, orgId } = await auth();

  // If user is not authenticated, redirect to home
  if (!userId) {
    redirect("/");
  }

  // If user has no organization, redirect to create organization
  if (!orgId) {
    redirect("/create-organization");
  }

  // Check if org exists in Redis
  const orgData = await getOrganizationById(orgId);

  if (!orgData) {
    // Org exists in Clerk but not in Redis - sync it
    redirect("/org-setup-complete");
  }

  // Organization is fully set up - redirect to subdomain
  redirect(`${protocol}://${orgData.slug}.${rootDomain}`);
}

