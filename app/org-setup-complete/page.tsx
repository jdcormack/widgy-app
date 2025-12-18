import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncOrganizationToRedis } from "@/app/actions";
import { protocol, rootDomain } from "@/lib/utils";

export default async function OrgSetupCompletePage() {
  const { userId, orgId } = await auth();

  // Require authentication
  if (!userId || !orgId) {
    redirect("/");
  }

  let orgSlug: string;

  try {
    // Sync organization to Redis and get the generated slug
    const result = await syncOrganizationToRedis();
    orgSlug = result.slug;
  } catch (error) {
    console.error("Error syncing organization:", error);

    // If there's an error during sync, show it
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Setup Error
            </h1>
            <p className="mt-3 text-lg text-red-600">
              {error instanceof Error
                ? error.message
                : "An error occurred during setup"}
            </p>
            <div className="mt-6">
              <a
                href="/"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to the subdomain after successful sync
  redirect(`${protocol}://${orgSlug}.${rootDomain}`);
}
