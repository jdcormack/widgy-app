"use server";

import { redis } from "@/lib/redis";
import {
  createOrganization,
  deleteOrganization,
  getOrganizationById,
} from "@/lib/organizations";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const subdomain = formData.get("subdomain");
  await redis.del(`subdomain:${subdomain}`);
  revalidatePath("/admin");
  return { success: "Domain deleted successfully" };
}

/**
 * Sync current user's organization to Redis
 */
export async function syncOrganizationToRedis() {
  const { userId, orgId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  if (!orgId) {
    throw new Error("No organization found");
  }

  try {
    // Get organization details from Clerk
    const client = await clerkClient();
    const organization = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    if (!organization.slug) {
      throw new Error(
        "Organization does not have a slug. Please set a slug in Clerk."
      );
    }

    // Create organization in Redis using Clerk's slug
    const org = await createOrganization({
      clerkOrgId: orgId,
      name: organization.name,
      slug: organization.slug, // Use Clerk's organization slug
    });

    return { success: true, slug: org.slug };
  } catch (error) {
    // If org already exists, get its slug
    if (error instanceof Error && error.message.includes("already taken")) {
      const existingOrg = await getOrganizationById(orgId);
      return { success: true, slug: existingOrg?.slug || "" };
    }
    throw error;
  }
}

/**
 * Delete an organization and its subdomain
 */
export async function deleteOrganizationAction(
  prevState: any,
  formData: FormData
) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if user has admin role
  const metadata = sessionClaims?.metadata as { role?: string } | undefined;
  const isAdmin = metadata?.role === "admin";
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = formData.get("orgId") as string;

  if (!orgId) {
    return { success: false, error: "Organization ID is required" };
  }

  try {
    await deleteOrganization(orgId);
    revalidatePath("/admin");
    return { success: true, message: "Organization deleted successfully" };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete organization",
    };
  }
}

export type OrganizationMember = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  identifier: string;
};

/**
 * Get all members of the current organization
 */
export async function getOrganizationMembers(): Promise<OrganizationMember[]> {
  const { orgId } = await auth();
  if (!orgId) return [];

  const client = await clerkClient();
  const response = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    limit: 100,
  });

  return response.data.map((m) => ({
    userId: m.publicUserData?.userId ?? "",
    firstName: m.publicUserData?.firstName ?? null,
    lastName: m.publicUserData?.lastName ?? null,
    imageUrl: m.publicUserData?.imageUrl ?? null,
    identifier: m.publicUserData?.identifier ?? "",
  }));
}
