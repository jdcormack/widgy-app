import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const feedbackSettingsValidator = v.object({
  _id: v.id("feedbackSettings"),
  _creationTime: v.number(),
  organizationId: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
  categories: v.optional(v.array(v.string())),
  updatedAt: v.number(),
});

/**
 * Get feedback settings for an organization.
 * Returns default settings if none exist.
 */
export const get = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.object({
    visibility: v.union(v.literal("public"), v.literal("private")),
  }),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!settings) {
      // Default to private
      return { visibility: "private" as const };
    }

    return { visibility: settings.visibility };
  },
});

/**
 * Get full settings record (for authenticated org members).
 */
export const getForOrg = query({
  args: {},
  returns: v.union(feedbackSettingsValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return null;
    }

    const settings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", identity.org_id as string)
      )
      .unique();

    return settings;
  },
});

/**
 * Update feedback visibility setting.
 * Creates settings if they don't exist.
 */
export const update = mutation({
  args: {
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to update feedback settings"
      );
    }

    const organizationId = identity.org_id as string;

    const existingSettings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        visibility: args.visibility,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("feedbackSettings", {
        organizationId,
        visibility: args.visibility,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Get available categories for an organization.
 * Returns categories array (empty if none).
 */
export const getCategories = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    if (!settings || !settings.categories) {
      return [];
    }

    return settings.categories;
  },
});

/**
 * Get available categories for the authenticated organization.
 * Returns categories array (empty if none).
 */
export const getCategoriesForOrg = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return [];
    }

    const settings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", identity.org_id as string)
      )
      .unique();

    if (!settings || !settings.categories) {
      return [];
    }

    return settings.categories;
  },
});

/**
 * Update feedback categories for the authenticated organization.
 * Preserves order and enforces max 20 categories limit.
 */
export const updateCategories = mutation({
  args: {
    categories: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to update feedback categories"
      );
    }

    const organizationId = identity.org_id as string;

    // Validate categories - filter empty strings
    const categories = args.categories.filter((cat) => cat.trim().length > 0);

    // Check for duplicates while preserving order
    const seen = new Set<string>();
    const uniqueCategories: string[] = [];
    for (const category of categories) {
      if (!seen.has(category)) {
        seen.add(category);
        uniqueCategories.push(category);
      }
    }

    if (uniqueCategories.length !== categories.length) {
      throw new Error("Duplicate categories are not allowed");
    }

    // Enforce max 20 categories limit
    if (uniqueCategories.length > 20) {
      throw new Error("Maximum 20 categories allowed");
    }

    // Validate category names (reasonable length)
    for (const category of uniqueCategories) {
      if (category.length > 50) {
        throw new Error("Category names must be 50 characters or less");
      }
    }

    const existingSettings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        categories: uniqueCategories,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("feedbackSettings", {
        organizationId,
        visibility: "private",
        categories: uniqueCategories,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
