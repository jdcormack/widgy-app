import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

// Event type validator (matches schema)
const eventTypeValidator = v.union(
  v.literal("card_status_changed"),
  v.literal("card_title_changed"),
  v.literal("card_comment_added"),
  v.literal("card_deleted"),
  v.literal("card_moved_to_board"),
  v.literal("card_removed_from_board"),
  v.literal("card_assigned"),
  v.literal("user_subscribed_to_board"),
  v.literal("user_unsubscribed_from_board"),
  v.literal("user_muted_card"),
  v.literal("user_unmuted_card"),
  v.literal("user_added_to_board"),
  v.literal("user_added_as_board_editor"),
  v.literal("user_removed_as_board_editor"),
  v.literal("user_added_as_board_owner"),
  v.literal("user_removed_as_board_owner"),
  v.literal("board_ownership_transferred"),
  v.literal("announcement_created"),
  v.literal("announcement_published"),
  v.literal("announcement_updated"),
  v.literal("announcement_deleted")
);

// Metadata validator
const metadataValidator = v.optional(
  v.object({
    oldValue: v.optional(v.string()),
    newValue: v.optional(v.string()),
    oldStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    targetUserId: v.optional(v.string()),
    cardTitle: v.optional(v.string()),
    boardName: v.optional(v.string()),
    announcementTitle: v.optional(v.string()),
  })
);

// Activity event validator for return types
const activityEventValidator = v.object({
  _id: v.id("activityEvents"),
  _creationTime: v.number(),
  eventType: eventTypeValidator,
  actorId: v.string(),
  boardId: v.optional(v.id("boards")),
  cardId: v.optional(v.id("cards")),
  commentId: v.optional(v.id("comments")),
  announcementId: v.optional(v.id("announcements")),
  organizationId: v.string(),
  metadata: metadataValidator,
});

// ============================================
// INTERNAL MUTATIONS (for logging events)
// ============================================

/**
 * Internal mutation to log an activity event.
 * Called from other mutations when trackable events occur.
 */
export const logEvent = internalMutation({
  args: {
    eventType: eventTypeValidator,
    actorId: v.string(),
    boardId: v.optional(v.id("boards")),
    cardId: v.optional(v.id("cards")),
    commentId: v.optional(v.id("comments")),
    announcementId: v.optional(v.id("announcements")),
    organizationId: v.string(),
    metadata: metadataValidator,
  },
  returns: v.id("activityEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityEvents", {
      eventType: args.eventType,
      actorId: args.actorId,
      boardId: args.boardId,
      cardId: args.cardId,
      commentId: args.commentId,
      announcementId: args.announcementId,
      organizationId: args.organizationId,
      metadata: args.metadata,
    });
  },
});

/**
 * Internal mutation to subscribe a user to a board.
 * Does not log events - used for auto-subscription flows.
 */
export const subscribeUserToBoard = internalMutation({
  args: {
    boardId: v.id("boards"),
    userId: v.string(),
    organizationId: v.string(),
  },
  returns: v.union(v.id("boardSubscriptions"), v.null()),
  handler: async (ctx, args) => {
    // Check if already subscribed
    const existing = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      return null; // Already subscribed
    }

    return await ctx.db.insert("boardSubscriptions", {
      boardId: args.boardId,
      userId: args.userId,
      organizationId: args.organizationId,
    });
  },
});

/**
 * Internal query to get all board subscribers.
 */
export const getBoardSubscribersInternal = internalQuery({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.array(
    v.object({
      _id: v.id("boardSubscriptions"),
      _creationTime: v.number(),
      boardId: v.id("boards"),
      userId: v.string(),
      organizationId: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .collect();
  },
});

// ============================================
// PUBLIC MUTATIONS - Board Subscriptions
// ============================================

/**
 * Subscribe the current user to a board.
 * Board subscription = watching all cards on the board (can mute individual cards)
 */
export const subscribeToBoard = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      throw new Error("Board not found or access denied");
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", identity.subject)
      )
      .unique();

    if (existing) {
      return null; // Already subscribed
    }

    // Subscribe to board (implicitly subscribes to all cards)
    await ctx.db.insert("boardSubscriptions", {
      boardId: args.boardId,
      userId: identity.subject,
      organizationId: identity.org_id as string,
    });

    // Clear any existing mutes for this board's cards (fresh start)
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const card of cards) {
      const existingMute = await ctx.db
        .query("cardMutes")
        .withIndex("by_cardId_and_userId", (q) =>
          q.eq("cardId", card._id).eq("userId", identity.subject)
        )
        .unique();

      if (existingMute) {
        await ctx.db.delete(existingMute._id);
      }
    }

    // Log event
    await ctx.db.insert("activityEvents", {
      eventType: "user_subscribed_to_board",
      actorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      metadata: { boardName: board.name },
    });

    return null;
  },
});

/**
 * Unsubscribe the current user from a board.
 */
export const unsubscribeFromBoard = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    const subscription = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", identity.subject)
      )
      .unique();

    if (subscription) {
      await ctx.db.delete(subscription._id);

      // Also clean up any card mutes for this board (they're now irrelevant)
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
        .collect();

      for (const card of cards) {
        const existingMute = await ctx.db
          .query("cardMutes")
          .withIndex("by_cardId_and_userId", (q) =>
            q.eq("cardId", card._id).eq("userId", identity.subject)
          )
          .unique();

        if (existingMute) {
          await ctx.db.delete(existingMute._id);
        }
      }

      // Log event
      await ctx.db.insert("activityEvents", {
        eventType: "user_unsubscribed_from_board",
        actorId: identity.subject,
        boardId: args.boardId,
        organizationId: identity.org_id as string,
        metadata: { boardName: board.name },
      });
    }

    return null;
  },
});

/**
 * Add another user as a watcher to a board.
 */
export const addBoardWatcher = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      throw new Error("Board not found or access denied");
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      return null; // Already subscribed
    }

    // Subscribe user to board
    await ctx.db.insert("boardSubscriptions", {
      boardId: args.boardId,
      userId: args.userId,
      organizationId: identity.org_id as string,
    });

    return null;
  },
});

/**
 * Remove a user from watching a board.
 */
export const removeBoardWatcher = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      throw new Error("Board not found or access denied");
    }

    const subscription = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (subscription) {
      await ctx.db.delete(subscription._id);
    }

    return null;
  },
});

// ============================================
// PUBLIC MUTATIONS - Card Mutes (opt-out)
// ============================================

/**
 * Mute a card - stop receiving updates for this specific card
 * while still being subscribed to its board.
 */
export const muteCard = mutation({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.organizationId !== identity.org_id) {
      throw new Error("Card not found or access denied");
    }

    // Check if already muted
    const existing = await ctx.db
      .query("cardMutes")
      .withIndex("by_cardId_and_userId", (q) =>
        q.eq("cardId", args.cardId).eq("userId", identity.subject)
      )
      .unique();

    if (existing) {
      return null; // Already muted
    }

    await ctx.db.insert("cardMutes", {
      cardId: args.cardId,
      userId: identity.subject,
      organizationId: identity.org_id as string,
    });

    // Log event
    await ctx.db.insert("activityEvents", {
      eventType: "user_muted_card",
      actorId: identity.subject,
      cardId: args.cardId,
      boardId: card.boardId,
      organizationId: identity.org_id as string,
      metadata: { cardTitle: card.title },
    });

    return null;
  },
});

/**
 * Unmute a card - resume receiving updates for this card.
 */
export const unmuteCard = mutation({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    const mute = await ctx.db
      .query("cardMutes")
      .withIndex("by_cardId_and_userId", (q) =>
        q.eq("cardId", args.cardId).eq("userId", identity.subject)
      )
      .unique();

    if (mute) {
      await ctx.db.delete(mute._id);

      // Log event
      await ctx.db.insert("activityEvents", {
        eventType: "user_unmuted_card",
        actorId: identity.subject,
        cardId: args.cardId,
        boardId: card.boardId,
        organizationId: identity.org_id as string,
        metadata: { cardTitle: card.title },
      });
    }

    return null;
  },
});

// ============================================
// PUBLIC QUERIES
// ============================================

/**
 * Get paginated activity feed for the current user.
 * Shows events for boards the user is subscribed to, minus muted cards.
 */
export const getActivityFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(activityEventValidator),
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

    const organizationId = identity.org_id as string;

    // Get all board subscriptions for the user
    const boardSubs = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_userId_and_organizationId", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", organizationId)
      )
      .collect();

    // Get all card mutes for the user
    const cardMutes = await ctx.db
      .query("cardMutes")
      .withIndex("by_userId_and_organizationId", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", organizationId)
      )
      .collect();

    const subscribedBoardIds = new Set(boardSubs.map((s) => s.boardId));
    const mutedCardIds = new Set(cardMutes.map((m) => m.cardId));

    // Query all events for the organization, then filter
    const results = await ctx.db
      .query("activityEvents")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", organizationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter events based on subscriptions and mutes
    const filteredEvents = results.page.filter((event) => {
      // Announcement events are visible to all authenticated org members
      if (event.announcementId) {
        return true;
      }

      // Skip muted cards
      if (event.cardId && mutedCardIds.has(event.cardId)) {
        return false;
      }

      // Include events the user performed
      if (event.actorId === identity.subject) {
        return true;
      }

      // For card events, check if user is subscribed to the card's board
      if (event.cardId) {
        // We need to check if the card belongs to a subscribed board
        // The event should have boardId set for card events
        if (event.boardId && subscribedBoardIds.has(event.boardId)) {
          return true;
        }
        return false;
      }

      // For board-level events, check if user is subscribed to the board
      if (event.boardId && subscribedBoardIds.has(event.boardId)) {
        return true;
      }

      return false;
    });

    return {
      ...results,
      page: filteredEvents,
    };
  },
});

/**
 * Get list of users subscribed to a board.
 */
export const getBoardSubscribers = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      return [];
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      return [];
    }

    const subscriptions = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .collect();

    return subscriptions.map((s) => s.userId);
  },
});

/**
 * Get list of users watching a card.
 * Computed as: board subscribers who haven't muted this card.
 */
export const getCardWatchers = query({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      return [];
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.organizationId !== identity.org_id) {
      return [];
    }

    // If card is not on a board, no one is watching
    if (!card.boardId) {
      return [];
    }

    const boardId = card.boardId;

    // Get board subscribers
    const boardSubs = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId", (q) => q.eq("boardId", boardId))
      .collect();

    // Get mutes for this card
    const mutes = await ctx.db
      .query("cardMutes")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId))
      .collect();

    const mutedUserIds = new Set(mutes.map((m) => m.userId));

    // Return board subscribers minus muted users
    return boardSubs
      .filter((s) => !mutedUserIds.has(s.userId))
      .map((s) => s.userId);
  },
});

/**
 * Check if current user is subscribed to a board.
 */
export const isSubscribedToBoard = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const subscription = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", identity.subject)
      )
      .unique();

    return !!subscription;
  },
});

/**
 * Check if current user is watching a card.
 * True if: subscribed to board AND not muted this card.
 */
export const isWatchingCard = query({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || !card.boardId) {
      return false;
    }

    const boardId = card.boardId;

    // Check if subscribed to board
    const boardSub = await ctx.db
      .query("boardSubscriptions")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", boardId).eq("userId", identity.subject)
      )
      .unique();

    if (!boardSub) {
      return false;
    }

    // Check if card is muted
    const mute = await ctx.db
      .query("cardMutes")
      .withIndex("by_cardId_and_userId", (q) =>
        q.eq("cardId", args.cardId).eq("userId", identity.subject)
      )
      .unique();

    return !mute;
  },
});

/**
 * Check if current user has muted a card.
 */
export const isCardMuted = query({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const mute = await ctx.db
      .query("cardMutes")
      .withIndex("by_cardId_and_userId", (q) =>
        q.eq("cardId", args.cardId).eq("userId", identity.subject)
      )
      .unique();

    return !!mute;
  },
});
