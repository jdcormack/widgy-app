import { getAllSubdomains } from "@/lib/subdomains";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AdminDashboard } from "./_dashboard";
import { rootDomain } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
  description: `Manage subdomains for ${rootDomain}`,
};

export default async function AdminPage() {
  const { userId, sessionClaims } = await auth();
  const user = await currentUser();

  // Require authentication
  if (!userId) {
    redirect("/sign-in");
  }

  const isAdmin = sessionClaims?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You do not have permission to access the admin dashboard.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tenants = await getAllSubdomains();

  // Format dates on the server to avoid hydration mismatches
  const tenantsWithFormattedDates = tenants.map((tenant) => ({
    ...tenant,
    formattedCreatedAt: new Date(tenant.createdAt).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="absolute top-4 right-4 flex gap-4 items-center">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Home
        </Link>
        <UserButton />
      </div>
      <AdminDashboard
        tenants={tenantsWithFormattedDates}
        userName={user?.firstName || user?.username || "Admin"}
      />
    </div>
  );
}
