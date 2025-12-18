import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/**
 * Require the user to be authenticated and a member of the specified organization.
 * Redirects to "/" if not authenticated or not in the org.
 */
export async function requireOrgAuth(organizationId: string) {
  const { userId, orgId } = await auth();

  if (!userId || orgId !== organizationId) {
    redirect("/");
  }

  return { userId, orgId };
}
