import type { Metadata } from "next";
import { getSubdomainData } from "@/lib/subdomains";
import { rootDomain } from "@/lib/utils";
import { SubdomainHomeClient } from "./_subdomain-home-client";

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
  return <SubdomainHomeClient />;
}
