import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Custom column validator for return types
const customColumnValidator = v.object({
  id: v.string(),
  name: v.string(),
  position: v.number(),
});

/**
 * Create a new board within an organization.
 * Requires authentication.
 */
export const create = mutation({
  args: {
    name: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.id("boards"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to create a board");
    }

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      organizationId: identity.org_id as string,
      visibility: args.visibility,
      createdBy: identity.subject,
      updatedAt: Date.now(),
    });

    return boardId;
  },
});

/**
 * Update a board's name and visibility.
 * Requires authentication and org membership.
 */
export const update = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to update a board");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      throw new Error("Board not found or access denied");
    }

    await ctx.db.patch(args.boardId, {
      name: args.name,
      visibility: args.visibility,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * List boards for an organization.
 * Returns all public boards, plus private boards if the user is authenticated.
 */
export const listByOrganization = query({
  args: {
    organizationId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("boards"),
      _creationTime: v.number(),
      name: v.string(),
      organizationId: v.string(),
      visibility: v.union(v.literal("public"), v.literal("private")),
      createdBy: v.string(),
      updatedAt: v.number(),
      customColumns: v.optional(v.array(customColumnValidator)),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const isAuthenticated =
      !!identity && identity.org_id === args.organizationId;

    const allBoards = await ctx.db
      .query("boards")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect();

    // Filter boards based on authentication
    const filteredBoards = isAuthenticated
      ? allBoards
      : allBoards.filter((board) => board.visibility === "public");

    // Sort by creation time descending (newest first) for stable ordering
    const sortedBoards = filteredBoards
      .map((board) => ({
        ...board,
        updatedAt: board.updatedAt ?? board._creationTime,
      }))
      .sort((a, b) => b._creationTime - a._creationTime);

    return sortedBoards;
  },
});

/**
 * Get a single board by ID.
 * Public boards can be viewed by anyone.
 * Private boards require authentication and org membership.
 */
export const getById = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.union(
    v.object({
      _id: v.id("boards"),
      _creationTime: v.number(),
      name: v.string(),
      organizationId: v.string(),
      visibility: v.union(v.literal("public"), v.literal("private")),
      createdBy: v.string(),
      updatedAt: v.number(),
      customColumns: v.optional(v.array(customColumnValidator)),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();

    // Public boards can be viewed by anyone
    if (board.visibility === "public") {
      return {
        ...board,
        updatedAt: board.updatedAt ?? board._creationTime,
      };
    }

    // Private boards require authentication and org membership
    if (!identity || identity.org_id !== board.organizationId) {
      return null;
    }

    return {
      ...board,
      updatedAt: board.updatedAt ?? board._creationTime,
    };
  },
});

/**
 * Delete a board and all its cards.
 * Requires authentication and org membership.
 */
export const remove = mutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to delete a board");
    }

    const board = await ctx.db.get(args.boardId);
    if (!board || board.organizationId !== identity.org_id) {
      throw new Error("Board not found or access denied");
    }

    // Delete all cards associated with this board
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete the board
    await ctx.db.delete(args.boardId);

    return null;
  },
});

/**
 * Internal mutation to update board timestamp.
 * Called when cards are added, updated, or removed from a board.
 */
export const updateTimestamp = internalMutation({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return null;
    }

    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Delete all boards for organizations matching a prefix.
 * Internal mutation for test cleanup - not exposed publicly.
 */
export const deleteByNamePrefix = internalMutation({
  args: {
    prefix: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const allBoards = await ctx.db.query("boards").collect();

    const boardsToDelete = allBoards.filter((board) =>
      board.name.toLowerCase().includes(args.prefix.toLowerCase())
    );

    for (const board of boardsToDelete) {
      await ctx.db.delete(board._id);
    }

    return boardsToDelete.length;
  },
});
