import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CreateOrganization, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { rootDomain } from "@/lib/utils";
import { getOrganizationById } from "@/lib/organizations";

export default async function CreateOrganizationPage() {
  const { userId, orgId } = await auth();

  // Require authentication
  if (!userId) {
    redirect("/");
  }

  // If user already has an org in Redis, redirect to it
  if (orgId) {
    const orgData = await getOrganizationById(orgId);
    if (orgData) {
      redirect(`/org-setup-complete?slug=${orgData.slug}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="absolute top-4 left-4">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="absolute top-4 right-4">
        <UserButton />
      </div>

      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Create Your Organization
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Your organization slug will be used as your subdomain on{" "}
            {rootDomain}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            For example: slug "doolaly" → doolaly.{rootDomain}
          </p>
          <p className="mt-2 text-sm text-yellow-600 font-medium">
            ⚠️ Make sure to set a slug when creating your organization - it will
            be your subdomain!
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <CreateOrganization
            afterCreateOrganizationUrl="/org-setup-complete"
            skipInvitationScreen={true}
          />
        </div>
      </div>
    </div>
  );
}
