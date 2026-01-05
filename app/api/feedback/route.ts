import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { feedbackRatelimit } from "@/lib/ratelimit";
import { getOrganizationById } from "@/lib/organizations";

const feedbackSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  email: z.string().email(),
  category: z.string().max(50).optional(),
  organizationId: z.string().min(1),
  website: z.string().optional(), // Honeypot field - should be empty
});

export async function POST(request: Request) {
  try {
    // Get IP address for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() ?? "anonymous";

    // Rate limit check
    const { success } = await feedbackRatelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const result = feedbackSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid input", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, email, category, organizationId, website } =
      result.data;

    // Honeypot check - if website field is filled, it's a bot
    // Silently accept to not reveal the honeypot
    if (website) {
      return NextResponse.json(
        { success: true, feedbackId: "ignored" },
        { status: 201 }
      );
    }

    // Verify organization exists
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Create the feedback in Convex
    const mutationArgs: {
      title: string;
      description: string;
      email: string;
      organizationId: string;
      origin?: string;
      category?: string;
    } = {
      title,
      description,
      email,
      organizationId,
      origin: "api",
    };

    if (category) {
      mutationArgs.category = category;
    }

    const feedbackId = await fetchMutation(api.feedback.createFromApi, mutationArgs);

    return NextResponse.json({ success: true, feedbackId }, { status: 201 });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
