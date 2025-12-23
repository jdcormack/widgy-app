import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Custom column schema for boards
const customColumnValidator = v.object({
  id: v.string(), // unique identifier (nanoid)
  name: v.string(), // display name
  position: v.number(), // position between next_up (1) and done (always last)
});

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

  feedback: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(v.literal("bug"), v.literal("feature")),
    status: v.union(
      v.literal("pending_screening"),
      v.literal("screened_in"),
      v.literal("archived"),
      v.literal("duplicate")
    ),
    userId: v.optional(v.string()), // Clerk user ID if authenticated
    onBehalfOfEmail: v.optional(v.string()), // Email for unauthenticated submissions
    organizationId: v.string(),
    duplicateOfId: v.optional(v.id("feedback")),
    origin: v.optional(v.string()), // "email", "web", "api", etc.
    shippedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_organizationId_and_status", ["organizationId", "status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["organizationId"],
    }),

  feedbackVotes: defineTable({
    feedbackId: v.id("feedback"),
    organizationId: v.string(),
    userId: v.optional(v.string()), // Clerk user ID if authenticated
    email: v.optional(v.string()), // Email if unauthenticated
  })
    .index("by_feedbackId", ["feedbackId"])
    .index("by_feedbackId_and_userId", ["feedbackId", "userId"])
    .index("by_feedbackId_and_email", ["feedbackId", "email"]),

  feedbackSettings: defineTable({
    organizationId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    updatedAt: v.number(),
  }).index("by_organizationId", ["organizationId"]),

  feedbackCardLinks: defineTable({
    feedbackId: v.id("feedback"),
    cardId: v.id("cards"),
    organizationId: v.string(),
  })
    .index("by_feedbackId", ["feedbackId"])
    .index("by_cardId", ["cardId"]),
});
