import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Custom column schema for boards
const customColumnValidator = v.object({
  id: v.string(), // unique identifier (nanoid)
  name: v.string(), // display name
  position: v.number(), // position between next_up (1) and done (always last)
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

export default defineSchema({
  boards: defineTable({
    name: v.string(),
    organizationId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    createdBy: v.string(),
    updatedAt: v.number(),
    customColumns: v.optional(v.array(customColumnValidator)),
  }).index("by_organizationId", ["organizationId"]),

  cards: defineTable({
    title: v.string(),
    description: v.string(),
    authorId: v.string(),
    boardId: v.optional(v.id("boards")),
    organizationId: v.string(),
    assignedTo: v.optional(v.string()),
    status: v.optional(v.string()), // "someday" | "next_up" | "done" | custom column id
    updatedAt: v.optional(v.number()), // Timestamp for sorting cards by most recently updated
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_boardId", ["boardId"])
    .index("by_boardId_and_status", ["boardId", "status"])
    .index("by_boardId_and_updatedAt", ["boardId", "updatedAt"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["organizationId"],
    })
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["organizationId"],
    }),

  comments: defineTable({
    cardId: v.id("cards"),
    authorId: v.string(),
    content: v.string(), // Markdown content
    organizationId: v.string(),
    updatedAt: v.optional(v.number()),
  }).index("by_cardId", ["cardId"]),

  cardEvents: defineTable({
    organizationId: v.string(),
    cardId: v.id("cards"),
    /**
     * Board context at the time of the event.
     * For move events, this should generally be the destination board.
     */
    boardId: v.optional(v.id("boards")),
    actorId: v.string(),
    kind: cardEventKindValidator,
    payload: v.optional(
      v.object({
        /**
         * Title change events store ONLY the new title.
         */
        title: v.optional(v.string()),
        /**
         * Comment events store ONLY the comment id.
         */
        commentId: v.optional(v.id("comments")),
        /**
         * Status events store the new status.
         */
        toStatus: v.optional(v.string()),
        /**
         * Assignee events store the new assignee (or null to represent "unassigned"
         * if you add a mutation that supports it).
         */
        toAssignee: v.optional(v.union(v.string(), v.null())),
        /**
         * Board move events store the source and destination board ids.
         */
        fromBoardId: v.optional(v.union(v.id("boards"), v.null())),
        toBoardId: v.optional(v.union(v.id("boards"), v.null())),
        /**
         * Deletion events store the last known title so feeds can render meaningfully.
         */
        deletedTitle: v.optional(v.string()),
      })
    ),
  })
    .index("by_cardId", ["cardId"])
    .index("by_organizationId", ["organizationId"])
    .index("by_boardId", ["boardId"]),

  boardFollowIntervals: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    boardId: v.id("boards"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_boardId", ["boardId"])
    .index("by_userId_and_organizationId", ["userId", "organizationId"])
    .index("by_userId_and_boardId", ["userId", "boardId"]),

  cardFollowIntervals: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    cardId: v.id("cards"),
    mode: v.union(v.literal("follow"), v.literal("mute")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_cardId", ["cardId"])
    .index("by_userId_and_organizationId", ["userId", "organizationId"])
    .index("by_userId_and_cardId", ["userId", "cardId"]),

  feedItems: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    eventId: v.id("cardEvents"),
    /**
     * Copy of the event's _creationTime, used for stable ordering/pagination.
     */
    eventTime: v.number(),
    cardId: v.id("cards"),
    boardId: v.optional(v.id("boards")),
  })
    .index("by_userId_and_organizationId_and_eventTime", [
      "userId",
      "organizationId",
      "eventTime",
    ])
    .index("by_userId_and_organizationId_and_eventId", [
      "userId",
      "organizationId",
      "eventId",
    ]),
});
