import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function isIntervalActive(
  interval: { startedAt: number; endedAt?: number | undefined },
  now: number
) {
  return interval.startedAt <= now && interval.endedAt === undefined;
}

/**
 * Follow a board. While following, the user receives feed items for card activity
 * within that board (unless they mute specific cards).
 */
export const followBoard = mutation({
  args: { boardId: v.id("boards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to follow a board");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      throw new Error("Board not found or access denied");
    }

    const now = Date.now();

    const existing = await ctx.db
      .query("boardFollowIntervals")
      .withIndex("by_userId_and_boardId", (q) =>
        q.eq("userId", identity.subject).eq("boardId", args.boardId)
      )
      .collect();

    const active = existing.find(
      (i) => i.organizationId === identity.org_id && isIntervalActive(i, now)
    );
    if (active) return null;

    await ctx.db.insert("boardFollowIntervals", {
      organizationId: identity.org_id as string,
      userId: identity.subject,
      boardId: args.boardId,
      startedAt: now,
      endedAt: undefined,
    });

    return null;
  },
});

export const unfollowBoard = mutation({
  args: { boardId: v.id("boards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to unfollow a board");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("boardFollowIntervals")
      .withIndex("by_userId_and_boardId", (q) =>
        q.eq("userId", identity.subject).eq("boardId", args.boardId)
      )
      .collect();

    const active = existing.find(
      (i) => i.organizationId === identity.org_id && isIntervalActive(i, now)
    );
    if (!active) return null;

    await ctx.db.patch(active._id, { endedAt: now });
    return null;
  },
});

/**
 * Follow a specific card (even if you do not follow its board).
 */
export const followCard = mutation({
  args: { cardId: v.id("cards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to follow a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.organizationId !== identity.org_id) {
      throw new Error("Card not found or access denied");
    }

    const now = Date.now();

    const existing = await ctx.db
      .query("cardFollowIntervals")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", identity.subject).eq("cardId", args.cardId)
      )
      .collect();

    // If muted, end the mute interval (follow implies "I want updates").
    const activeMute = existing.find(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "mute" &&
        isIntervalActive(i, now)
    );
    if (activeMute) {
      await ctx.db.patch(activeMute._id, { endedAt: now });
    }

    const activeFollow = existing.find(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "follow" &&
        isIntervalActive(i, now)
    );
    if (activeFollow) return null;

    await ctx.db.insert("cardFollowIntervals", {
      organizationId: identity.org_id as string,
      userId: identity.subject,
      cardId: args.cardId,
      mode: "follow",
      startedAt: now,
      endedAt: undefined,
    });

    return null;
  },
});

export const unfollowCard = mutation({
  args: { cardId: v.id("cards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to unfollow a card");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("cardFollowIntervals")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", identity.subject).eq("cardId", args.cardId)
      )
      .collect();

    const activeFollow = existing.find(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "follow" &&
        isIntervalActive(i, now)
    );
    if (!activeFollow) return null;

    await ctx.db.patch(activeFollow._id, { endedAt: now });
    return null;
  },
});

/**
 * Mute a card: opt out of seeing its activity in your feed (even if following the board).
 */
export const muteCard = mutation({
  args: { cardId: v.id("cards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to mute a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.organizationId !== identity.org_id) {
      throw new Error("Card not found or access denied");
    }

    const now = Date.now();

    const existing = await ctx.db
      .query("cardFollowIntervals")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", identity.subject).eq("cardId", args.cardId)
      )
      .collect();

    // If following, end the follow interval (mute implies "stop updates").
    const activeFollow = existing.find(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "follow" &&
        isIntervalActive(i, now)
    );
    if (activeFollow) {
      await ctx.db.patch(activeFollow._id, { endedAt: now });
    }

    const activeMute = existing.find(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "mute" &&
        isIntervalActive(i, now)
    );
    if (activeMute) return null;

    await ctx.db.insert("cardFollowIntervals", {
      organizationId: identity.org_id as string,
      userId: identity.subject,
      cardId: args.cardId,
      mode: "mute",
      startedAt: now,
      endedAt: undefined,
    });

    return null;
  },
});

export const unmuteCard = mutation({
  args: { cardId: v.id("cards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to unmute a card");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("cardFollowIntervals")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", identity.subject).eq("cardId", args.cardId)
      )
      .collect();

    const activeMute = existing.find(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "mute" &&
        isIntervalActive(i, now)
    );
    if (!activeMute) return null;

    await ctx.db.patch(activeMute._id, { endedAt: now });
    return null;
  },
});

/**
 * Helper query for UI toggles.
 */
export const getMyFollowsForCard = query({
  args: { cardId: v.id("cards") },
  returns: v.object({
    isFollowingCard: v.boolean(),
    isMutingCard: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      return { isFollowingCard: false, isMutingCard: false };
    }

    const now = Date.now();
    const intervals = await ctx.db
      .query("cardFollowIntervals")
      .withIndex("by_userId_and_cardId", (q) =>
        q.eq("userId", identity.subject).eq("cardId", args.cardId)
      )
      .collect();

    const isFollowingCard = intervals.some(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "follow" &&
        isIntervalActive(i, now)
    );
    const isMutingCard = intervals.some(
      (i) =>
        i.organizationId === identity.org_id &&
        i.mode === "mute" &&
        isIntervalActive(i, now)
    );

    return { isFollowingCard, isMutingCard };
  },
});

