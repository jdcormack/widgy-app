import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from "@/lib/organizations";

export async function POST(req: Request) {
  // Get the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env.local");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with the secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "organization.created") {
    const { id, name, slug } = evt.data;

    if (!name) {
      console.error("Organization created without name");
      return new Response("Organization must have a name", {
        status: 400,
      });
    }

    if (!slug) {
      console.error("Organization created without slug");
      return new Response("Organization must have a slug", {
        status: 400,
      });
    }

    try {
      const org = await createOrganization({
        clerkOrgId: id,
        name,
        slug, // Use Clerk's organization slug
      });

      console.log(`✅ Organization created in Redis: ${name} (${org.slug})`);
    } catch (error) {
      // If org already exists, that's okay
      if (error instanceof Error && error.message.includes("already exists")) {
        console.log(`ℹ️ Organization already exists: ${name}`);
      } else {
        console.error("Error creating organization:", error);
        return new Response("Error creating organization", {
          status: 500,
        });
      }
    }
  }

  if (eventType === "organization.updated") {
    const { id, name, slug } = evt.data;

    if (!name) {
      console.error("Organization updated without name");
      return new Response("Organization must have a name", {
        status: 400,
      });
    }

    try {
      // Update with Clerk's slug if it changed
      await updateOrganization(id, {
        name,
        slug: slug || undefined, // Use Clerk's slug if provided
      });

      console.log(
        `✅ Organization updated in Redis: ${name} ${slug ? `(${slug})` : ""}`
      );
    } catch (error) {
      console.error("Error updating organization:", error);
      // Don't return error - just log it
    }
  }

  if (eventType === "organization.deleted") {
    const { id } = evt.data;

    if (!id) {
      console.error("Organization deleted without ID");
      return new Response("Organization must have an ID", {
        status: 400,
      });
    }

    try {
      await deleteOrganization(id);
      console.log(`✅ Organization deleted from Redis: ${id}`);
    } catch (error) {
      console.error("Error deleting organization:", error);
      // Don't return error - just log it
    }
  }

  return new Response("Webhook processed successfully", { status: 200 });
}
