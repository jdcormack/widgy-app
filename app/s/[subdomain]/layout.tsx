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
    <div className="flex flex-col h-screen">
      <PageHeader />
      <div className="flex flex-1 flex-col rounded-lg px-5 py-5 mx-2 mt-5 md:m-5 border shadow-xl border-slate-200 overflow-auto">
        {children}
      </div>
    </div>
  );
}
