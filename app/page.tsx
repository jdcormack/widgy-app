import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { rootDomain, protocol } from "@/lib/utils";
import { getOrganizationById } from "@/lib/organizations";
import { UserButton } from "@clerk/nextjs";
import Logo from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { LockKeyhole, MoveRight } from "lucide-react";

export default async function HomePage() {
  const { userId, orgId, sessionClaims } = await auth();
  const user = await currentUser();

  // If user is signed in
  if (userId) {
    // Check if user has an organization in Clerk
    if (orgId) {
      // Check if org exists in Redis
      const orgData = await getOrganizationById(orgId);

      if (!orgData) {
        // Org exists in Clerk but not in Redis - sync it
        redirect("/org-setup-complete");
      }

      const isAdmin = sessionClaims?.role === "admin";

      return (
        <div className="flex flex-col min-h-screen bg-white">
          <header className="flex items-center justify-between py-4 px-6">
            <Logo />
            <div className="flex gap-4 items-center">
              {isAdmin && (
                <Link
                  href="/admin"
                  title="Admin"
                  className="flex gap-1 items-center transition-colors font-bold"
                >
                  <div>
                    <LockKeyhole className="size-4" />
                  </div>
                  Admin
                </Link>
              )}
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              />
            </div>
          </header>

          <div className="flex-1 relative flex items-center justify-center px-6 py-12">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-purple-200 to-transparent blur-3xl opacity-60"></div>
            <div className="relative z-10 w-full max-w-md space-y-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome back, {user?.firstName || "User"}!
                </h1>
              </div>

              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Log back into your workspace{" "}
                    <span className="font-mono text-blue-600">
                      {orgData.slug}.{rootDomain}
                    </span>
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link
                      href={`${protocol}://${orgData.slug}.${rootDomain}`}
                      className={buttonVariants({ className: "w-full" })}
                    >
                      Continue
                      <MoveRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-4 px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Logo variant="light" />
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-gray-500 text-sm">
                <Link
                  href="https://www.widgy.co"
                  className=" hover:text-gray-700 transition-colors"
                >
                  Home
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-gray-700 transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-gray-700 transition-colors"
                >
                  Terms
                </Link>
              </div>
            </div>
          </footer>
        </div>
      );
    }

    // If user is signed in but no org, redirect to create organization
    redirect("/create-organization");
  }

  // User is not signed in - show sign-in page
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="flex items-center py-4 px-6">
        <Logo />
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="hidden lg:flex lg:w-[45%] relative items-end pb-16 pl-12">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-purple-200 to-transparent blur-3xl opacity-60"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-black">
              Gather feedback. Plan better. Ship faster.
            </h1>
          </div>
        </div>

        <div className="flex-1 lg:w-[55%] flex items-center justify-center px-6 py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <h2 className="w-full max-w-md text-2xl font-bold">
              Get into widgy
            </h2>
            <div className="w-full max-w-md">
              <Link
                href="/sign-in"
                className={buttonVariants({ className: "w-full group" })}
              >
                Sign in
                <MoveRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <p className="p-2">
              New here?{" "}
              <Link
                href="/sign-up"
                className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
              >
                Sign up
              </Link>{" "}
              to create your account.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo variant="light" />
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-gray-500 text-sm">
            <Link
              href="https://www.widgy.co"
              className=" hover:text-gray-700 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/privacy"
              className="hover:text-gray-700 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-gray-700 transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
