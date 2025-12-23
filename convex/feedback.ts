import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

// Validators for feedback
const feedbackValidator = v.object({
  _id: v.id("feedback"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  category: v.union(v.literal("bug"), v.literal("feature")),
  status: v.union(
    v.literal("pending_screening"),
    v.literal("screened_in"),
    v.literal("archived"),
    v.literal("duplicate")
  ),
  userId: v.optional(v.string()),
  onBehalfOfEmail: v.optional(v.string()),
  organizationId: v.string(),
  duplicateOfId: v.optional(v.id("feedback")),
  origin: v.optional(v.string()),
  shippedAt: v.optional(v.number()),
  updatedAt: v.number(),
});

const feedbackWithVoteCountValidator = v.object({
  _id: v.id("feedback"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  category: v.union(v.literal("bug"), v.literal("feature")),
  status: v.union(
    v.literal("pending_screening"),
    v.literal("screened_in"),
    v.literal("archived"),
    v.literal("duplicate")
  ),
  userId: v.optional(v.string()),
  onBehalfOfEmail: v.optional(v.string()),
  organizationId: v.string(),
  duplicateOfId: v.optional(v.id("feedback")),
  origin: v.optional(v.string()),
  shippedAt: v.optional(v.number()),
  updatedAt: v.number(),
  voteCount: v.number(),
});

const cardValidator = v.object({
  _id: v.id("cards"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  authorId: v.string(),
  boardId: v.optional(v.id("boards")),
  organizationId: v.string(),
  assignedTo: v.optional(v.string()),
  status: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
});

/**
 * Create feedback (authenticated users only).
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(v.literal("bug"), v.literal("feature")),
    origin: v.optional(v.string()),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to create feedback");
    }

    return await ctx.db.insert("feedback", {
      title: args.title,
      description: args.description,
      category: args.category,
      status: "pending_screening",
      userId: identity.subject,
      organizationId: identity.org_id as string,
      origin: args.origin ?? "web",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Create feedback from the public API (rate-limited, no auth required).
 * Called by the API endpoint. Note: The API route handles rate limiting
 * and validation before calling this mutation.
 */
export const createFromApi = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.union(v.literal("bug"), v.literal("feature")),
    email: v.string(),
    organizationId: v.string(),
    origin: v.optional(v.string()),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("feedback", {
      title: args.title,
      description: args.description,
      category: args.category,
      status: "pending_screening",
      onBehalfOfEmail: args.email,
      organizationId: args.organizationId,
      origin: args.origin ?? "api",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update feedback (auth required, must be org member).
 */
export const update = mutation({
  args: {
    feedbackId: v.id("feedback"),
    title: v.string(),
    description: v.string(),
    category: v.union(v.literal("bug"), v.literal("feature")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to update feedback");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot update feedback from another organization"
      );
    }

    await ctx.db.patch(args.feedbackId, {
      title: args.title,
      description: args.description,
      category: args.category,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Vote on feedback.
 * Requires either authentication or email.
 */
export const vote = mutation({
  args: {
    feedbackId: v.id("feedback"),
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const feedback = await ctx.db.get(args.feedbackId);

    if (!feedback) {
      throw new Error("Feedback not found");
    }

    // Must have either auth or email
    if (!identity && !args.email) {
      throw new Error("Must be logged in or provide email to vote");
    }

    // Check for existing vote
    if (identity) {
      const existingVote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedbackId_and_userId", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("userId", identity.subject)
        )
        .unique();

      if (existingVote) {
        throw new Error("You have already voted on this feedback");
      }

      await ctx.db.insert("feedbackVotes", {
        feedbackId: args.feedbackId,
        organizationId: feedback.organizationId,
        userId: identity.subject,
      });
    } else if (args.email) {
      const existingVote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedbackId_and_email", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("email", args.email)
        )
        .unique();

      if (existingVote) {
        throw new Error("This email has already voted on this feedback");
      }

      await ctx.db.insert("feedbackVotes", {
        feedbackId: args.feedbackId,
        organizationId: feedback.organizationId,
        email: args.email,
      });
    }

    return null;
  },
});

/**
 * Remove vote from feedback.
 */
export const removeVote = mutation({
  args: {
    feedbackId: v.id("feedback"),
    email: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity && !args.email) {
      throw new Error("Must be logged in or provide email to remove vote");
    }

    let existingVote;
    if (identity) {
      existingVote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedbackId_and_userId", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("userId", identity.subject)
        )
        .unique();
    } else if (args.email) {
      existingVote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedbackId_and_email", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("email", args.email)
        )
        .unique();
    }

    if (!existingVote) {
      throw new Error("No vote found to remove");
    }

    await ctx.db.delete(existingVote._id);
    return null;
  },
});

/**
 * Screen in feedback (move from pending to screened_in).
 */
export const screenIn = mutation({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to screen feedback");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot screen feedback from another organization"
      );
    }

    if (feedback.status !== "pending_screening") {
      throw new Error("Feedback is not in pending_screening status");
    }

    await ctx.db.patch(args.feedbackId, {
      status: "screened_in",
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Archive feedback.
 */
export const archive = mutation({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to archive feedback");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot archive feedback from another organization"
      );
    }

    await ctx.db.patch(args.feedbackId, {
      status: "archived",
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Mark feedback as duplicate.
 */
export const markDuplicate = mutation({
  args: {
    feedbackId: v.id("feedback"),
    duplicateOfId: v.id("feedback"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error(
        "Unauthorized: Must be logged in to mark feedback as duplicate"
      );
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot modify feedback from another organization"
      );
    }

    const originalFeedback = await ctx.db.get(args.duplicateOfId);
    if (!originalFeedback) {
      throw new Error("Original feedback not found");
    }

    if (originalFeedback.organizationId !== identity.org_id) {
      throw new Error("Original feedback must be from the same organization");
    }

    if (args.feedbackId === args.duplicateOfId) {
      throw new Error("Cannot mark feedback as duplicate of itself");
    }

    await ctx.db.patch(args.feedbackId, {
      status: "duplicate",
      duplicateOfId: args.duplicateOfId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Mark feedback as shipped.
 * Validates all linked cards are done.
 */
export const ship = mutation({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to ship feedback");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot ship feedback from another organization"
      );
    }

    if (feedback.status !== "screened_in") {
      throw new Error("Only screened_in feedback can be shipped");
    }

    // Check all linked cards are done
    const links = await ctx.db
      .query("feedbackCardLinks")
      .withIndex("by_feedbackId", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    for (const link of links) {
      const card = await ctx.db.get(link.cardId);
      if (card && card.status !== "done") {
        throw new Error(
          "All linked cards must be done before shipping feedback"
        );
      }
    }

    await ctx.db.patch(args.feedbackId, {
      shippedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Link a card to feedback.
 */
export const linkCard = mutation({
  args: {
    feedbackId: v.id("feedback"),
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to link cards");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot link cards to feedback from another organization"
      );
    }

    // Cannot link cards to shipped feedback
    if (feedback.shippedAt) {
      throw new Error("Cannot link cards to shipped feedback");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error("Card must be from the same organization");
    }

    // Check if already linked
    const existingLinks = await ctx.db
      .query("feedbackCardLinks")
      .withIndex("by_feedbackId", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const alreadyLinked = existingLinks.some(
      (link) => link.cardId === args.cardId
    );
    if (alreadyLinked) {
      throw new Error("Card is already linked to this feedback");
    }

    await ctx.db.insert("feedbackCardLinks", {
      feedbackId: args.feedbackId,
      cardId: args.cardId,
      organizationId: identity.org_id as string,
    });

    return null;
  },
});

/**
 * Unlink a card from feedback.
 */
export const unlinkCard = mutation({
  args: {
    feedbackId: v.id("feedback"),
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to unlink cards");
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    if (feedback.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot unlink cards from feedback in another organization"
      );
    }

    // Cannot unlink cards from shipped feedback
    if (feedback.shippedAt) {
      throw new Error("Cannot unlink cards from shipped feedback");
    }

    const links = await ctx.db
      .query("feedbackCardLinks")
      .withIndex("by_feedbackId", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const linkToRemove = links.find((link) => link.cardId === args.cardId);
    if (!linkToRemove) {
      throw new Error("Card is not linked to this feedback");
    }

    await ctx.db.delete(linkToRemove._id);

    return null;
  },
});

/**
 * List screened-in feedback (respects visibility settings).
 * Public boards can be viewed by anyone.
 * Private boards require authentication and org membership.
 */
export const list = query({
  args: {
    organizationId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(feedbackWithVoteCountValidator),
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

    // Check visibility settings
    const settings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .unique();

    const visibility = settings?.visibility ?? "private";

    // If private, require org membership
    if (visibility === "private") {
      if (!identity || identity.org_id !== args.organizationId) {
        return {
          page: [],
          isDone: true,
          continueCursor: "",
        };
      }
    }

    // Get screened-in feedback only
    const results = await ctx.db
      .query("feedback")
      .withIndex("by_organizationId_and_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "screened_in")
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Add vote counts
    const feedbackWithVotes = await Promise.all(
      results.page.map(async (feedback) => {
        const votes = await ctx.db
          .query("feedbackVotes")
          .withIndex("by_feedbackId", (q) => q.eq("feedbackId", feedback._id))
          .collect();
        return { ...feedback, voteCount: votes.length };
      })
    );

    // Sort by vote count (descending), then by creation time (descending)
    feedbackWithVotes.sort((a, b) => {
      if (b.voteCount !== a.voteCount) {
        return b.voteCount - a.voteCount;
      }
      return b._creationTime - a._creationTime;
    });

    return {
      ...results,
      page: feedbackWithVotes,
    };
  },
});

/**
 * List pending screening feedback (auth required).
 */
export const listPendingScreening = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(feedbackValidator),
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
      .query("feedback")
      .withIndex("by_organizationId_and_status", (q) =>
        q
          .eq("organizationId", identity.org_id as string)
          .eq("status", "pending_screening")
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return results;
  },
});

/**
 * Get pending screening count for the callout.
 */
export const getPendingScreeningCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return 0;
    }

    const pending = await ctx.db
      .query("feedback")
      .withIndex("by_organizationId_and_status", (q) =>
        q
          .eq("organizationId", identity.org_id as string)
          .eq("status", "pending_screening")
      )
      .collect();

    return pending.length;
  },
});

/**
 * Get feedback by ID with vote count.
 */
export const getById = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.union(feedbackWithVoteCountValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const feedback = await ctx.db.get(args.feedbackId);

    if (!feedback) {
      return null;
    }

    // Check visibility settings
    const settings = await ctx.db
      .query("feedbackSettings")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", feedback.organizationId)
      )
      .unique();

    const visibility = settings?.visibility ?? "private";

    // If private, require org membership
    if (visibility === "private") {
      if (!identity || identity.org_id !== feedback.organizationId) {
        return null;
      }
    }

    // Get vote count
    const votes = await ctx.db
      .query("feedbackVotes")
      .withIndex("by_feedbackId", (q) => q.eq("feedbackId", feedback._id))
      .collect();

    return { ...feedback, voteCount: votes.length };
  },
});

/**
 * Get cards linked to feedback.
 */
export const getLinkedCards = query({
  args: {
    feedbackId: v.id("feedback"),
  },
  returns: v.array(cardValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return [];
    }

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.organizationId !== identity.org_id) {
      return [];
    }

    const links = await ctx.db
      .query("feedbackCardLinks")
      .withIndex("by_feedbackId", (q) => q.eq("feedbackId", args.feedbackId))
      .collect();

    const cards: Array<{
      _id: Id<"cards">;
      _creationTime: number;
      title: string;
      description: string;
      authorId: string;
      boardId?: Id<"boards">;
      organizationId: string;
      assignedTo?: string;
      status?: string;
      updatedAt?: number;
    }> = [];
    for (const link of links) {
      const card = await ctx.db.get(link.cardId);
      if (card) {
        cards.push(card);
      }
    }

    return cards;
  },
});

/**
 * Check if user has voted on feedback.
 */
export const hasUserVoted = query({
  args: {
    feedbackId: v.id("feedback"),
    email: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (identity) {
      const vote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedbackId_and_userId", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("userId", identity.subject)
        )
        .unique();
      return vote !== null;
    }

    if (args.email) {
      const vote = await ctx.db
        .query("feedbackVotes")
        .withIndex("by_feedbackId_and_email", (q) =>
          q.eq("feedbackId", args.feedbackId).eq("email", args.email)
        )
        .unique();
      return vote !== null;
    }

    return false;
  },
});

/**
 * Search for potential duplicates during screening.
 * Searches all feedback except archived and already-marked duplicates.
 */
export const searchDuplicates = query({
  args: {
    query: v.string(),
  },
  returns: v.array(feedbackValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return [];
    }

    if (args.query.trim().length < 1) {
      return [];
    }

    const results = await ctx.db
      .query("feedback")
      .withSearchIndex("search_title", (q) =>
        q
          .search("title", args.query)
          .eq("organizationId", identity.org_id as string)
      )
      .take(20);

    // Filter out archived and duplicate feedback - show screened_in and pending_screening
    return results
      .filter(
        (f) => f.status === "screened_in" || f.status === "pending_screening"
      )
      .slice(0, 10);
  },
});

/**
 * Get feedback linked to a specific card.
 */
export const getFeedbackByCardId = query({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.array(feedbackValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return [];
    }

    const links = await ctx.db
      .query("feedbackCardLinks")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId))
      .collect();

    const feedbackItems: Array<{
      _id: Id<"feedback">;
      _creationTime: number;
      title: string;
      description: string;
      category: "bug" | "feature";
      status: "pending_screening" | "screened_in" | "archived" | "duplicate";
      userId?: string;
      onBehalfOfEmail?: string;
      organizationId: string;
      duplicateOfId?: Id<"feedback">;
      origin?: string;
      shippedAt?: number;
      updatedAt: number;
    }> = [];
    for (const link of links) {
      const feedback = await ctx.db.get(link.feedbackId);
      if (feedback && feedback.organizationId === identity.org_id) {
        feedbackItems.push(feedback);
      }
    }

    return feedbackItems;
  },
});
