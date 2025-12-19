import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { BoardsGrid } from "@/components/boards";

export default async function BoardsPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  await requireOrgAuth(subdomainData.organizationId);

  return <BoardsGrid organizationId={subdomainData.organizationId} />;
}
