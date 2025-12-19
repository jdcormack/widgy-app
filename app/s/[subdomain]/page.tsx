import type { Metadata } from "next";
import { getSubdomainData } from "@/lib/subdomains";
import { rootDomain } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    return {
      title: rootDomain,
    };
  }

  return {
    title: `${subdomain}.${rootDomain}`,
    description: `Subdomain page for ${subdomain}.${rootDomain}`,
  };
}

export default async function SubdomainPage() {
  return (
    <>
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
        Welcome
      </h1>
    </>
  );
}
