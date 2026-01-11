import { PageHeader } from "@/components/page-header";
import { getSubdomainData } from "@/lib/subdomains";
import { notFound } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <div className="flex flex-col h-screen bg-blue-50/30">
      <PageHeader />

      <div className="flex flex-1 flex-col md:rounded-t-2xl md:mx-5 mt-5 p-4 md:p-5 max-md:border-t md:border shadow-xl border-slate-200 bg-white">
        {children}
      </div>
    </div>
  );
}
