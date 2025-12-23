import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const feedbackSettingsValidator = v.object({
  _id: v.id("feedbackSettings"),
  _creationTime: v.number(),
  organizationId: v.string(),
  visibility: v.union(v.literal("public"), v.literal("private")),
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
