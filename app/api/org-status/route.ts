import { auth } from "@clerk/nextjs/server";
import { getOrganizationById } from "@/lib/organizations";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const org = await getOrganizationById(orgId);

  // Debug logging
  console.log(
    `[org-status] Checking org ${orgId}:`,
    org ? `found (${org.slug})` : "not found"
  );

  if (!org) {
    return NextResponse.json({ exists: false, orgId });
  }

  return NextResponse.json({ exists: true, slug: org.slug });
}
