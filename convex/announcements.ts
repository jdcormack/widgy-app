import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";

// Validators
const announcementStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published")
);

const announcementValidator = v.object({
  _id: v.id("announcements"),
  _creationTime: v.number(),
  title: v.string(),
  details: v.string(),
  status: announcementStatusValidator,
  organizationId: v.string(),
  authorId: v.string(),
  publishedAt: v.optional(v.number()),
  updatedAt: v.number(),
});

/**
 * Create a draft announcement (authenticated users only).
 */
export const create = mutation({
  args: {
    title: v.string(),
    details: v.string(),
  },
  returns: v.id("announcements"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to create announcements"
      );
    }

    const announcementId = await ctx.db.insert("announcements", {
      title: args.title,
      details: args.details,
      status: "draft",
      organizationId: identity.org_id as string,
      authorId: identity.subject,
      updatedAt: Date.now(),
    });

    // Log activity event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "announcement_created",
      actorId: identity.subject,
      organizationId: identity.org_id as string,
      announcementId,
      metadata: {
        announcementTitle: args.title,
      },
    });

    return announcementId;
  },
});

/**
 * Update an announcement (authenticated org members only).
 */
export const update = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.string(),
    details: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to update announcements"
      );
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot update announcement from another organization"
      );
    }

    await ctx.db.patch(args.announcementId, {
      title: args.title,
      details: args.details,
      updatedAt: Date.now(),
    });

    // Log activity event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "announcement_updated",
      actorId: identity.subject,
      organizationId: identity.org_id as string,
      announcementId: args.announcementId,
      metadata: {
        announcementTitle: args.title,
      },
    });

    return null;
  },
});

/**
 * Publish a draft announcement (authenticated org members only).
 */
export const publish = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to publish announcements"
      );
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot publish announcement from another organization"
      );
    }

    if (announcement.status !== "draft") {
      throw new Error("Only draft announcements can be published");
    }

    await ctx.db.patch(args.announcementId, {
      status: "published",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log activity event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "announcement_published",
      actorId: identity.subject,
      organizationId: identity.org_id as string,
      announcementId: args.announcementId,
      metadata: {
        announcementTitle: announcement.title,
      },
    });

    return null;
  },
});

/**
 * Unpublish an announcement (authenticated org members only).
 */
export const unpublish = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to unpublish announcements"
      );
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot unpublish announcement from another organization"
      );
    }

    if (announcement.status !== "published") {
      throw new Error("Only published announcements can be unpublished");
    }

    await ctx.db.patch(args.announcementId, {
      status: "draft",
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete an announcement (authenticated org members only).
 */
export const deleteAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to delete announcements"
      );
    }

    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      throw new Error("Announcement not found");
    }

    if (announcement.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot delete announcement from another organization"
      );
    }

    const title = announcement.title;

    await ctx.db.delete(args.announcementId);

    // Log activity event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "announcement_deleted",
      actorId: identity.subject,
      organizationId: identity.org_id as string,
      metadata: {
        announcementTitle: title,
      },
    });

    return null;
  },
});

/**
 * List announcements with pagination.
 * Shows only published announcements to public users.
 * Shows all announcements (draft + published) to authenticated org members.
 */
export const list = query({
  args: {
    organizationId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(announcementValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null()
      )
    ),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const isAuthenticated = identity && identity.org_id === args.organizationId;

    if (!isAuthenticated) {
      // Public users: only show published announcements
      const results = await ctx.db
        .query("announcements")
        .withIndex("by_organizationId_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "published")
        )
        .order("desc")
        .paginate(args.paginationOpts);

      // Sort by publishedAt descending (need to sort manually since publishedAt isn't in index)
      const sortedPage = results.page.sort((a, b) => {
        const aDate = a.publishedAt ?? 0;
        const bDate = b.publishedAt ?? 0;
        return bDate - aDate;
      });

      return {
        page: sortedPage,
        isDone: results.isDone,
        continueCursor: results.continueCursor,
        pageStatus: results.pageStatus,
        splitCursor: results.splitCursor,
      };
    }

    // Authenticated org members: get both published and draft, then combine and sort
    const [publishedResults, draftResults] = await Promise.all([
      ctx.db
        .query("announcements")
        .withIndex("by_organizationId_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "published")
        )
        .order("desc")
        .collect(),
      ctx.db
        .query("announcements")
        .withIndex("by_organizationId_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", "draft")
        )
        .order("desc")
        .collect(),
    ]);

    // Sort published by publishedAt descending, drafts by _creationTime descending
    const sortedPublished = publishedResults.sort((a, b) => {
      const aDate = a.publishedAt ?? 0;
      const bDate = b.publishedAt ?? 0;
      return bDate - aDate;
    });

    // Combine: published first, then drafts
    const allAnnouncements = [...sortedPublished, ...draftResults];

    // Manual pagination
    const cursor = args.paginationOpts.cursor
      ? parseInt(args.paginationOpts.cursor, 10)
      : 0;
    const numItems = args.paginationOpts.numItems;
    const startIndex = cursor;
    const endIndex = startIndex + numItems;
    const page = allAnnouncements.slice(startIndex, endIndex);
    const isDone = endIndex >= allAnnouncements.length;
    const continueCursor = isDone ? "" : endIndex.toString();

    return {
      page,
      isDone,
      continueCursor,
      pageStatus: null,
      splitCursor: null,
    };
  },
});

/**
 * Get a single announcement by ID (respects visibility rules).
 */
export const getById = query({
  args: {
    announcementId: v.id("announcements"),
  },
  returns: v.union(announcementValidator, v.null()),
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();

    // If draft, only show to authenticated org members
    if (announcement.status === "draft") {
      if (!identity || identity.org_id !== announcement.organizationId) {
        return null;
      }
    }

    // Published announcements are visible to all
    return announcement;
  },
});

/**
 * List all drafts for the organization (admin only - checked in UI).
 */
export const listDrafts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(announcementValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null()
      )
    ),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const results = await ctx.db
      .query("announcements")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", identity.org_id as string).eq("status", "draft")
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return results;
  },
});
