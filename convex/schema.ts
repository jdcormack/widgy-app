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
    .index("by_boardId_and_updatedAt", ["boardId", "updatedAt"]),
});
