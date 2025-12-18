import { redis } from "@/lib/redis";

export type OrganizationData = {
  clerkOrgId: string;
  name: string;
  slug: string;
  createdAt: number;
};

/**
 * Generate a clean slug from organization name
 */
export function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Get organization data by its slug
 */
export async function getOrganizationBySlug(slug: string) {
  const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Use slug index to get org ID
  const orgId = await redis.get<string>(`orgSlugIndex:${sanitizedSlug}`);

  if (!orgId) {
    return null;
  }

  const orgData = await redis.get<OrganizationData>(`org:${orgId}`);
  return orgData;
}

/**
 * Get organization data by its ID
 */
export async function getOrganizationById(orgId: string) {
  const orgData = await redis.get<OrganizationData>(`org:${orgId}`);
  return orgData;
}

/**
 * Create a new organization in Redis
 * Uses Clerk's organization slug for subdomain routing
 */
export async function createOrganization(data: {
  clerkOrgId: string;
  name: string;
  slug: string; // Required - must be Clerk's organization slug
}) {
  // Sanitize the Clerk slug
  const sanitizedSlug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

  // Check if slug is already taken
  const existingOrg = await getOrganizationBySlug(sanitizedSlug);
  if (existingOrg && existingOrg.clerkOrgId !== data.clerkOrgId) {
    throw new Error(
      `Slug "${sanitizedSlug}" is already taken by another organization`
    );
  }

  const orgData: OrganizationData = {
    clerkOrgId: data.clerkOrgId,
    name: data.name,
    slug: sanitizedSlug,
    createdAt: Date.now(),
  };

  // Store organization data
  await redis.set(`org:${data.clerkOrgId}`, orgData);

  // Create slug index for quick lookups
  await redis.set(`orgSlugIndex:${sanitizedSlug}`, data.clerkOrgId);

  // Create subdomain entry
  await redis.set(`subdomain:${sanitizedSlug}`, {
    organizationId: data.clerkOrgId,
    organizationName: data.name,
    organizationSlug: sanitizedSlug,
    createdAt: Date.now(),
  });

  return orgData;
}

/**
 * Update an organization in Redis
 */
export async function updateOrganization(
  clerkOrgId: string,
  updates: Partial<Omit<OrganizationData, "clerkOrgId" | "createdAt">>
) {
  const existingOrg = await getOrganizationById(clerkOrgId);

  if (!existingOrg) {
    throw new Error("Organization not found");
  }

  const updatedOrg: OrganizationData = {
    ...existingOrg,
    ...updates,
  };

  // Update organization data
  await redis.set(`org:${clerkOrgId}`, updatedOrg);

  // If slug changed, update slug index and subdomain
  if (updates.slug && updates.slug !== existingOrg.slug) {
    const newSlug = updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

    // Remove old slug index
    await redis.del(`orgSlugIndex:${existingOrg.slug}`);

    // Create new slug index
    await redis.set(`orgSlugIndex:${newSlug}`, clerkOrgId);

    // Remove old subdomain
    await redis.del(`subdomain:${existingOrg.slug}`);

    // Create new subdomain
    await redis.set(`subdomain:${newSlug}`, {
      organizationId: clerkOrgId,
      organizationName: updates.name || existingOrg.name,
      organizationSlug: newSlug,
      createdAt: existingOrg.createdAt,
    });
  } else if (updates.name) {
    // Just update the name in the subdomain
    await redis.set(`subdomain:${existingOrg.slug}`, {
      organizationId: clerkOrgId,
      organizationName: updates.name,
      organizationSlug: existingOrg.slug,
      createdAt: existingOrg.createdAt,
    });
  }

  return updatedOrg;
}

/**
 * Delete an organization from Redis
 */
export async function deleteOrganization(clerkOrgId: string) {
  const org = await getOrganizationById(clerkOrgId);

  if (!org) {
    return false;
  }

  // Delete organization data
  await redis.del(`org:${clerkOrgId}`);

  // Delete slug index
  await redis.del(`orgSlugIndex:${org.slug}`);

  // Delete subdomain
  await redis.del(`subdomain:${org.slug}`);

  return true;
}

/**
 * Get all organizations
 */
export async function getAllOrganizations() {
  const keys = await redis.keys("org:*");

  if (!keys.length) {
    return [];
  }

  const values = await redis.mget<OrganizationData[]>(...keys);

  return keys.map((key, index) => {
    const orgId = key.replace("org:", "");
    const data = values[index];

    return {
      clerkOrgId: orgId,
      name: data?.name || "Unknown",
      slug: data?.slug || "",
      createdAt: data?.createdAt || Date.now(),
    };
  });
}
