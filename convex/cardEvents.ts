import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

const cardEventKindValidator = v.union(
  v.literal("card_created"),
  v.literal("card_deleted"),
  v.literal("card_title_changed"),
  v.literal("card_status_changed"),
  v.literal("card_assignee_changed"),
  v.literal("card_board_changed"),
  v.literal("comment_created")
);

const cardEventPayloadValidator = v.optional(
  v.object({
    title: v.optional(v.string()),
    commentId: v.optional(v.id("comments")),
    toStatus: v.optional(v.string()),
    toAssignee: v.optional(v.union(v.string(), v.null())),
    fromBoardId: v.optional(v.union(v.id("boards"), v.null())),
    toBoardId: v.optional(v.union(v.id("boards"), v.null())),
    deletedTitle: v.optional(v.string()),
  })
);

function isIntervalActive(
  interval: { startedAt: number; endedAt?: number | undefined },
  now: number
) {
  return interval.startedAt <= now && interval.endedAt === undefined;
}

async function createFeedItemsForEvent(args: {
  ctx: any;
  eventId: Id<"cardEvents">;
  organizationId: string;
  cardId: Id<"cards">;
  boardId?: Id<"boards"> | undefined;
  boardContextIds: Array<Id<"boards">>;
  now: number;
}) {
  const { ctx, eventId, organizationId, cardId, boardId, boardContextIds, now } =
    args;

  // 1) Card followers (explicit "follow")
  const cardIntervals = await ctx.db
    .query("cardFollowIntervals")
    .withIndex("by_cardId", (q: any) => q.eq("cardId", cardId))
    .collect();

  const cardFollowers = new Set<string>();
  const mutedUsers = new Set<string>();

  for (const interval of cardIntervals) {
    if (interval.organizationId !== organizationId) continue;
    if (!isIntervalActive(interval, now)) continue;
    if (interval.mode === "follow") cardFollowers.add(interval.userId);
    if (interval.mode === "mute") mutedUsers.add(interval.userId);
  }

  // 2) Board followers
  const boardFollowers = new Set<string>();
  for (const contextBoardId of boardContextIds) {
    const boardIntervals = await ctx.db
      .query("boardFollowIntervals")
      .withIndex("by_boardId", (q: any) => q.eq("boardId", contextBoardId))
      .collect();

    for (const interval of boardIntervals) {
      if (interval.organizationId !== organizationId) continue;
      if (!isIntervalActive(interval, now)) continue;
      boardFollowers.add(interval.userId);
    }
  }

  // Mute is strongest: if a user is actively muting the card, exclude from feed.
  const recipientUserIds = new Set<string>();
  for (const userId of cardFollowers) {
    if (!mutedUsers.has(userId)) recipientUserIds.add(userId);
  }
  for (const userId of boardFollowers) {
    if (!mutedUsers.has(userId)) recipientUserIds.add(userId);
  }

  const event = await ctx.db.get(eventId);
  if (!event) return;

  for (const userId of recipientUserIds) {
    await ctx.db.insert("feedItems", {
      organizationId,
      userId,
      eventId,
      eventTime: event._creationTime,
      cardId,
      boardId,
    });
  }
}

/**
 * Internal: insert a card event and fan it out into user feeds based on
 * follow/mute intervals active at the time of insertion.
 */
export const log = internalMutation({
  args: {
    organizationId: v.string(),
    cardId: v.id("cards"),
    boardId: v.optional(v.id("boards")),
    actorId: v.string(),
    kind: cardEventKindValidator,
    payload: cardEventPayloadValidator,
    /**
     * Boards whose followers should receive this event. For board moves, include both.
     * For non-board events, pass [] if unassigned or [boardId] when assigned.
     */
    boardContextIds: v.array(v.id("boards")),
  },
  returns: v.id("cardEvents"),
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("cardEvents", {
      organizationId: args.organizationId,
      cardId: args.cardId,
      boardId: args.boardId,
      actorId: args.actorId,
      kind: args.kind,
      payload: args.payload,
    });

    await createFeedItemsForEvent({
      ctx,
      eventId,
      organizationId: args.organizationId,
      cardId: args.cardId,
      boardId: args.boardId,
      boardContextIds: args.boardContextIds,
      now: Date.now(),
    });

    return eventId;
  },
});

/**
 * Internal: batch log card_deleted events (used for board deletion).
 */
export const logCardDeletedBatch = internalMutation({
  args: {
    organizationId: v.string(),
    actorId: v.string(),
    cards: v.array(
      v.object({
        cardId: v.id("cards"),
        title: v.string(),
        boardId: v.optional(v.id("boards")),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const card of args.cards) {
      const boardContextIds: Array<Id<"boards">> = card.boardId
        ? [card.boardId]
        : [];

      const eventId: Id<"cardEvents"> = await ctx.db.insert("cardEvents", {
        organizationId: args.organizationId,
        cardId: card.cardId,
        boardId: card.boardId,
        actorId: args.actorId,
        kind: "card_deleted",
        payload: { deletedTitle: card.title },
      });

      await createFeedItemsForEvent({
        ctx,
        eventId,
        organizationId: args.organizationId,
        cardId: card.cardId,
        boardId: card.boardId,
        boardContextIds,
        now,
      });
    }

    return null;
  },
});

const cardEventValidator = v.object({
  _id: v.id("cardEvents"),
  _creationTime: v.number(),
  organizationId: v.string(),
  cardId: v.id("cards"),
  boardId: v.optional(v.id("boards")),
  actorId: v.string(),
  kind: cardEventKindValidator,
  payload: cardEventPayloadValidator,
});

/**
 * Public: list activity events for a card.
 */
export const listByCard = query({
  args: {
    cardId: v.id("cards"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(cardEventValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null())
    ),
    splitCursor: v.optional(v.union(v.string(), v.null())),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.organizationId !== identity.org_id) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("cardEvents")
      .withIndex("by_cardId", (q) => q.eq("cardId", args.cardId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

