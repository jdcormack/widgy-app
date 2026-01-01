import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  cardId: v.id("cards"),
  authorId: v.string(),
  content: v.string(),
  organizationId: v.string(),
  updatedAt: v.optional(v.number()),
});

/**
 * Create a new comment on a card.
 * Requires authentication and org membership.
 */
export const create = mutation({
  args: {
    cardId: v.id("cards"),
    content: v.string(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to create a comment");
    }

    // Verify the card exists and belongs to the user's organization
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot comment on card from another organization"
      );
    }

    const commentId = await ctx.db.insert("comments", {
      cardId: args.cardId,
      authorId: identity.subject,
      content: args.content,
      organizationId: identity.org_id as string,
      updatedAt: Date.now(),
    });

    // Log comment added event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "card_comment_added" as const,
      actorId: identity.subject,
      cardId: args.cardId,
      commentId: commentId,
      boardId: card.boardId,
      organizationId: identity.org_id as string,
      metadata: {
        cardTitle: card.title,
      },
    });

    return commentId;
  },
});

/**
 * List comments for a specific card.
 * Requires authentication and org membership.
 * Returns comments sorted by creation time ascending (oldest first).
 */
export const listByCard = query({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.array(commentValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return [];
    }

    // Verify the card exists and belongs to the user's organization
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      return [];
    }

    if (card.organizationId !== identity.org_id) {
      return [];
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId))
      .order("asc")
      .collect();

    return comments;
  },
});

/**
 * Update a comment's content.
 * Only the comment author can update their comment.
 * Requires authentication.
 */
export const update = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to update a comment");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot update comment from another organization"
      );
    }

    // Only the author can update their comment
    if (comment.authorId !== identity.subject) {
      throw new Error("Unauthorized: Only the author can update this comment");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete a comment.
 * Only the comment author can delete their comment.
 * Requires authentication.
 */
export const remove = mutation({
  args: {
    commentId: v.id("comments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to delete a comment");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot delete comment from another organization"
      );
    }

    // Only the author can delete their comment
    if (comment.authorId !== identity.subject) {
      throw new Error("Unauthorized: Only the author can delete this comment");
    }

    await ctx.db.delete(args.commentId);

    return null;
  },
});
