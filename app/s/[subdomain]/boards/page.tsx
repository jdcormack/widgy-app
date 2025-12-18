import { notFound } from "next/navigation";
import { getSubdomainData } from "@/lib/subdomains";
import { requireOrgAuth } from "@/lib/auth";
import { BoardsGrid } from "@/components/boards";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/page-container";

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

  return (
    <>
      <PageHeader />

      <PageContainer>
        <BoardsGrid organizationId={subdomainData.organizationId} />
      </PageContainer>
    </>
  );
}
