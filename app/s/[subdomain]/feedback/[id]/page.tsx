import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getSubdomainData } from "@/lib/subdomains";
import { FeedbackDetailClient } from "@/components/feedback";
import { Id } from "@/convex/_generated/dataModel";
import { getOrganizationMembers, getCurrentUserId } from "@/app/actions";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ subdomain: string; id: string }>;
}) {
  const { subdomain, id } = await params;
  const subdomainData = await getSubdomainData(subdomain);

  if (!subdomainData) {
    notFound();
  }

  // Get auth status - visibility check happens in client component
  const { userId, orgId } = await auth();
  const isAuthenticated = !!userId && orgId === subdomainData.organizationId;

  const feedbackId = id as Id<"feedback">;

  const [
    preloadedFeedback,
    preloadedLinkedCards,
    preloadedBoards,
    members,
    currentUserId,
  ] = await Promise.all([
    preloadQuery(api.feedback.getById, { feedbackId }),
    isAuthenticated
      ? preloadQuery(api.feedback.getLinkedCards, { feedbackId })
      : null,
    isAuthenticated
      ? preloadQuery(api.boards.listByOrganization, {
          organizationId: subdomainData.organizationId,
        })
      : null,
    isAuthenticated ? getOrganizationMembers() : [],
    isAuthenticated ? getCurrentUserId() : "",
  ]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <FeedbackDetailClient
        feedbackId={feedbackId}
        preloadedFeedback={preloadedFeedback}
        preloadedLinkedCards={preloadedLinkedCards}
        preloadedBoards={preloadedBoards}
        members={members}
        currentUserId={currentUserId}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
