import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header";
import { getSubdomainData } from "@/lib/subdomains";
import { notFound } from "next/navigation";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  return (
    <>
      <PageHeader />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
