import { query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

const feedItemValidator = v.object({
  _id: v.id("feedItems"),
  _creationTime: v.number(),
  organizationId: v.string(),
  userId: v.string(),
  eventId: v.id("cardEvents"),
  eventTime: v.number(),
  cardId: v.id("cards"),
  boardId: v.optional(v.id("boards")),
});

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
 * List the current user's activity feed for their active organization.
 *
 * The feed is materialized into `feedItems` at event creation time based on
 * follow/mute intervals active at that moment.
 */
export const listForMe = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(
      v.object({
        feedItem: feedItemValidator,
        event: v.union(cardEventValidator, v.null()),
      })
    ),
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

    const organizationId = identity.org_id as string;

    const results = await ctx.db
      .query("feedItems")
      .withIndex("by_userId_and_organizationId_and_eventTime", (q) =>
        q.eq("userId", identity.subject).eq("organizationId", organizationId)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      results.page.map(async (feedItem) => {
        const event = await ctx.db.get(feedItem.eventId);
        if (!event || event.organizationId !== organizationId) {
          return { feedItem, event: null };
        }
        return { feedItem, event };
      })
    );

    return { ...results, page };
  },
});

