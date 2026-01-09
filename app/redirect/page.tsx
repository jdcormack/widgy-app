import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { protocol, rootDomain } from "@/lib/utils";
import { syncOrganizationToRedis } from "../actions";

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

  const result = await syncOrganizationToRedis();
  redirect(`${protocol}://${result.slug}.${rootDomain}`);
}
