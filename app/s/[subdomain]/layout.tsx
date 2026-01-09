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
    <div className="flex flex-col min-h-screen">
      <PageHeader />
      <div className="flex grow flex-col rounded-lg px-5 py-5 mx-2 mt-5 md:m-5 outline-1 shadow-xl outline-slate-200">
        {children}
      </div>
    </div>
  );
}
