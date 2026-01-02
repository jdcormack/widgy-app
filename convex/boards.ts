import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";

// Custom column validator for return types
const customColumnValidator = v.object({
  id: v.string(),
  name: v.string(),
  position: v.number(),
});

// Helper type for board member role
type BoardMemberRole = "owner" | "editor" | "viewer";

/**
 * Helper function to get board owners
 */
async function getBoardOwners(ctx: any, boardId: any): Promise<string[]> {
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_role", (q: any) =>
      q.eq("boardId", boardId).eq("role", "owner")
    )
    .collect();
  return members.map((m: Doc<"boardMembers">) => m.userId);
}

/**
 * Helper function to get board editors (owners + editors)
 */
async function getBoardEditors(ctx: any, boardId: any): Promise<string[]> {
  const owners = await getBoardOwners(ctx, boardId);
  const editors = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_role", (q: any) =>
      q.eq("boardId", boardId).eq("role", "editor")
    )
    .collect();
  const editorIds = editors.map((e: Doc<"boardMembers">) => e.userId);
  return Array.from(new Set([...owners, ...editorIds]));
}

/**
 * Helper function to get board viewers
 */
async function getBoardViewers(ctx: any, boardId: any): Promise<string[]> {
  const members = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_role", (q: any) =>
      q.eq("boardId", boardId).eq("role", "viewer")
    )
    .collect();
  return members.map((m: Doc<"boardMembers">) => m.userId);
}

/**
 * Helper function to check if user is owner
 */
async function isUserOwner(
  ctx: any,
  boardId: any,
  userId: string
): Promise<boolean> {
  const member = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_userId", (q: any) =>
      q.eq("boardId", boardId).eq("userId", userId)
    )
    .unique();
  return member?.role === "owner";
}

/**
 * Helper function to check if user is editor (owner or editor)
 */
async function isUserEditor(
  ctx: any,
  boardId: any,
  userId: string
): Promise<boolean> {
  const member = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_userId", (q: any) =>
      q.eq("boardId", boardId).eq("userId", userId)
    )
    .unique();
  return member?.role === "owner" || member?.role === "editor";
}

/**
 * Helper function to check if user is viewer
 */
async function isUserViewer(
  ctx: any,
  boardId: any,
  userId: string
): Promise<boolean> {
  const member = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_userId", (q: any) =>
      q.eq("boardId", boardId).eq("userId", userId)
    )
    .unique();
  return (
    member?.role === "owner" ||
    member?.role === "editor" ||
    member?.role === "viewer"
  );
}

/**
 * Helper function to set board member role
 */
async function setBoardMember(
  ctx: any,
  boardId: any,
  userId: string,
  role: BoardMemberRole,
  organizationId: string
): Promise<void> {
  const existing = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_userId", (q: any) =>
      q.eq("boardId", boardId).eq("userId", userId)
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { role });
  } else {
    await ctx.db.insert("boardMembers", {
      boardId,
      userId,
      role,
      organizationId,
    });
  }
}

/**
 * Helper function to remove board member
 */
async function removeBoardMember(
  ctx: any,
  boardId: any,
  userId: string
): Promise<void> {
  const existing = await ctx.db
    .query("boardMembers")
    .withIndex("by_boardId_and_userId", (q: any) =>
      q.eq("boardId", boardId).eq("userId", userId)
    )
    .unique();

  if (existing) {
    await ctx.db.delete(existing._id);
  }
  // If doesn't exist, nothing to do - safe to ignore
}

/**
 * Helper function to ensure user is owner or editor, throws if not.
 * Checks owner first (1 query), then editor only if needed (2 queries total).
 */
async function requireOwnerOrEditor(
  ctx: any,
  boardId: any,
  userId: string,
  errorMessage: string = "Unauthorized: Only owners or editors can perform this action"
): Promise<void> {
  const userIsOwner = await isUserOwner(ctx, boardId, userId);
  if (!userIsOwner) {
    const userIsEditor = await isUserEditor(ctx, boardId, userId);
    if (!userIsEditor) {
      throw new Error(errorMessage);
    }
  }
}

/**
 * Create a new board within an organization.
 * Requires authentication.
 */
export const create = mutation({
  args: {
    name: v.string(),
    visibility: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("restricted")
    ),
    ownerIds: v.optional(v.array(v.string())),
    viewerIds: v.optional(v.array(v.string())),
    editorIds: v.optional(v.array(v.string())),
  },
  returns: v.id("boards"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to create a board");
    }

    const organizationId = identity.org_id as string;

    // Set ownerIds - default to creator if not provided, must have at least 1
    const ownerIds =
      args.ownerIds && args.ownerIds.length > 0
        ? args.ownerIds
        : [identity.subject];

    // Handle restricted boards - ensure owners are always included as viewers
    let finalViewerIds = args.viewerIds;
    if (args.visibility === "restricted") {
      // Start with provided viewerIds or empty array
      finalViewerIds = args.viewerIds ? [...args.viewerIds] : [];

      // Ensure all owners are in viewerIds
      const viewerIdsSet = new Set(finalViewerIds);
      for (const ownerId of ownerIds) {
        if (!viewerIdsSet.has(ownerId)) {
          finalViewerIds.push(ownerId);
        }
      }

      // After including owners, validate we have at least one user
      if (finalViewerIds.length === 0) {
        throw new Error("Restricted boards require at least one viewer");
      }
    }

    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      organizationId,
      visibility: args.visibility,
      createdBy: identity.subject,
      updatedAt: Date.now(),
    });

    // Create board members
    // Add owners
    for (const userId of ownerIds) {
      await setBoardMember(ctx, boardId, userId, "owner", organizationId);
    }

    // Add editors (excluding owners)
    if (args.editorIds) {
      const ownerIdsSet = new Set(ownerIds);
      for (const userId of args.editorIds) {
        if (!ownerIdsSet.has(userId)) {
          await setBoardMember(ctx, boardId, userId, "editor", organizationId);
        }
      }
    }

    // Add viewers for restricted boards (excluding owners and editors)
    if (args.visibility === "restricted" && finalViewerIds) {
      const ownerIdsSet = new Set(ownerIds);
      const editorIdsSet = new Set(args.editorIds || []);
      for (const userId of finalViewerIds) {
        if (!ownerIdsSet.has(userId) && !editorIdsSet.has(userId)) {
          await setBoardMember(ctx, boardId, userId, "viewer", organizationId);
        }
      }
    }

    // Auto-subscribe all owners and viewers/editors to the board
    const usersToSubscribe = new Set<string>();
    ownerIds.forEach((id) => usersToSubscribe.add(id));
    if (finalViewerIds) {
      finalViewerIds.forEach((id) => usersToSubscribe.add(id));
    }
    if (args.editorIds) {
      args.editorIds.forEach((id) => usersToSubscribe.add(id));
    }

    for (const userId of usersToSubscribe) {
      await ctx.scheduler.runAfter(0, internal.activity.subscribeUserToBoard, {
        boardId,
        userId,
        organizationId,
      });
    }

    // Log activity events for viewers added to restricted boards (except owners)
    if (args.visibility === "restricted" && finalViewerIds) {
      const ownerIdsSet = new Set(ownerIds);
      for (const userId of finalViewerIds) {
        if (!ownerIdsSet.has(userId)) {
          await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
            eventType: "user_added_to_board",
            actorId: identity.subject,
            boardId,
            organizationId,
            metadata: {
              targetUserId: userId,
              boardName: args.name,
            },
          });
        }
      }
    }

    // Log activity events for editors added (except owners)
    if (args.editorIds) {
      const ownerIdsSet = new Set(ownerIds);
      for (const userId of args.editorIds) {
        if (!ownerIdsSet.has(userId)) {
          await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
            eventType: "user_added_as_board_editor",
            actorId: identity.subject,
            boardId,
            organizationId,
            metadata: {
              targetUserId: userId,
              boardName: args.name,
            },
          });
        }
      }
    }

    return boardId;
  },
});

/**
 * Update a board's name and visibility.
 * Requires authentication and org membership.
 * Only owners or editors can update a board.
 */
export const update = mutation({
  args: {
    boardId: v.id("boards"),
    name: v.string(),
    visibility: v.union(
      v.literal("public"),
      v.literal("private"),
      v.literal("restricted")
    ),
    viewerIds: v.optional(v.array(v.string())),
    editorIds: v.optional(v.array(v.string())),
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

    // Check if user is owner or editor
    await requireOwnerOrEditor(
      ctx,
      args.boardId,
      identity.subject,
      "Unauthorized: Only owners or editors can update a board"
    );

    const organizationId = identity.org_id as string;
    const ownerIds = await getBoardOwners(ctx, args.boardId);
    const ownerIdsSet = new Set(ownerIds);
    const oldVisibility = board.visibility as
      | "public"
      | "private"
      | "restricted";
    const oldViewerIds = await getBoardViewers(ctx, args.boardId);
    const oldEditorMembers = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId_and_role", (q) =>
        q.eq("boardId", args.boardId).eq("role", "editor")
      )
      .collect();
    const oldEditorIds = oldEditorMembers.map(
      (m: Doc<"boardMembers">) => m.userId
    );
    const oldViewerIdsSet = new Set(oldViewerIds);
    const oldEditorIdsSet = new Set(oldEditorIds);

    // Handle visibility changes
    const visibility = args.visibility as "public" | "private" | "restricted";
    let newViewerIds = args.viewerIds;

    // Check if new visibility is restricted
    const isRestricted = visibility === "restricted";
    const wasRestricted = oldVisibility === "restricted";

    if (isRestricted) {
      // Start with provided viewerIds, or existing ones if already restricted, or empty array
      newViewerIds = args.viewerIds
        ? [...args.viewerIds]
        : wasRestricted
          ? oldViewerIds
          : [];

      // Ensure all owners are in viewerIds
      const viewerIdsSet = new Set(newViewerIds);
      for (const ownerId of ownerIds) {
        if (!viewerIdsSet.has(ownerId)) {
          newViewerIds.push(ownerId);
        }
      }

      // After including owners, validate we have at least one user
      if (newViewerIds.length === 0) {
        throw new Error("Restricted boards require at least one viewer");
      }
    } else if (wasRestricted && !isRestricted) {
      // Clearing viewerIds when changing from restricted
      newViewerIds = undefined;
    }

    // Handle editor changes - ensure owners are not removed
    let newEditorIds = args.editorIds;
    if (newEditorIds !== undefined) {
      // Ensure all owners are in editorIds
      newEditorIds = [...newEditorIds];
      for (const ownerId of ownerIds) {
        if (!newEditorIds.includes(ownerId)) {
          newEditorIds.push(ownerId);
        }
      }
    }

    // Update the board
    await ctx.db.patch(args.boardId, {
      name: args.name,
      visibility: visibility,
      updatedAt: Date.now(),
    });

    // Update board members for restricted boards
    if (isRestricted && newViewerIds) {
      // Remove old viewers that are no longer in the list
      for (const userId of oldViewerIds) {
        // Only remove if they're not in new list and not an owner or editor
        if (
          !newViewerIds.includes(userId) &&
          !ownerIdsSet.has(userId) &&
          !oldEditorIdsSet.has(userId)
        ) {
          await removeBoardMember(ctx, args.boardId, userId);
        }
      }
      // Add new viewers
      for (const userId of newViewerIds) {
        // Skip if already owner, editor, or viewer
        if (
          !ownerIdsSet.has(userId) &&
          !oldEditorIdsSet.has(userId) &&
          !oldViewerIdsSet.has(userId)
        ) {
          await setBoardMember(
            ctx,
            args.boardId,
            userId,
            "viewer",
            organizationId
          );
        }
      }
    } else if (wasRestricted && !isRestricted) {
      // Remove all viewers when changing from restricted
      for (const userId of oldViewerIds) {
        if (!ownerIdsSet.has(userId)) {
          const member = await ctx.db
            .query("boardMembers")
            .withIndex("by_boardId_and_userId", (q) =>
              q.eq("boardId", args.boardId).eq("userId", userId)
            )
            .unique();
          if (member && member.role === "viewer") {
            await removeBoardMember(ctx, args.boardId, userId);
          }
        }
      }
    }

    // Update editors
    if (newEditorIds !== undefined) {
      // Remove old editors that are no longer in the list (but not owners)
      for (const userId of oldEditorIds) {
        if (!newEditorIds.includes(userId) && !ownerIdsSet.has(userId)) {
          const member = await ctx.db
            .query("boardMembers")
            .withIndex("by_boardId_and_userId", (q) =>
              q.eq("boardId", args.boardId).eq("userId", userId)
            )
            .unique();
          if (member && member.role === "editor") {
            await removeBoardMember(ctx, args.boardId, userId);
          }
        }
      }
      // Add new editors
      for (const userId of newEditorIds) {
        if (!ownerIdsSet.has(userId) && !oldEditorIdsSet.has(userId)) {
          await setBoardMember(
            ctx,
            args.boardId,
            userId,
            "editor",
            organizationId
          );
        }
      }
    }

    // Handle visibility changes - subscribe/unsubscribe users
    if (newViewerIds) {
      const newViewerIdsSet = new Set(newViewerIds);
      // Subscribe new viewers
      for (const userId of newViewerIds) {
        if (!oldViewerIdsSet.has(userId)) {
          await ctx.scheduler.runAfter(
            0,
            internal.activity.subscribeUserToBoard,
            {
              boardId: args.boardId,
              userId,
              organizationId: identity.org_id as string,
            }
          );
          // Log event for non-owners
          if (!ownerIdsSet.has(userId)) {
            await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
              eventType: "user_added_to_board",
              actorId: identity.subject,
              boardId: args.boardId,
              organizationId: identity.org_id as string,
              metadata: {
                targetUserId: userId,
                boardName: args.name,
              },
            });
          }
        }
      }
    }

    // Handle editor changes - subscribe/unsubscribe
    if (newEditorIds !== undefined) {
      const newEditorIdsSet = new Set(newEditorIds);
      // Subscribe new editors
      for (const userId of newEditorIds) {
        if (!oldEditorIdsSet.has(userId)) {
          await ctx.scheduler.runAfter(
            0,
            internal.activity.subscribeUserToBoard,
            {
              boardId: args.boardId,
              userId,
              organizationId: identity.org_id as string,
            }
          );
          // Log event for non-owners
          if (!ownerIdsSet.has(userId)) {
            await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
              eventType: "user_added_as_board_editor",
              actorId: identity.subject,
              boardId: args.boardId,
              organizationId: identity.org_id as string,
              metadata: {
                targetUserId: userId,
                boardName: args.name,
              },
            });
          }
        }
      }
      // Unsubscribe removed editors (but not owners)
      for (const userId of oldEditorIds) {
        if (!newEditorIdsSet.has(userId) && !ownerIdsSet.has(userId)) {
          await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
            eventType: "user_removed_as_board_editor",
            actorId: identity.subject,
            boardId: args.boardId,
            organizationId: identity.org_id as string,
            metadata: {
              targetUserId: userId,
              boardName: args.name,
            },
          });
        }
      }
    }

    return null;
  },
});

/**
 * List boards for an organization.
 * Returns all public boards, plus private boards if the user is authenticated.
 * Restricted boards are only returned if the user is in viewerIds.
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
      visibility: v.union(
        v.literal("public"),
        v.literal("private"),
        v.literal("restricted")
      ),
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

    // Filter boards based on authentication and visibility
    const filteredBoards: typeof allBoards = [];
    for (const board of allBoards) {
      // Public boards: anyone can see
      if (board.visibility === "public") {
        filteredBoards.push(board);
        continue;
      }

      // Private boards: authenticated org members can see
      if (board.visibility === "private") {
        if (isAuthenticated) {
          filteredBoards.push(board);
        }
        continue;
      }

      // Restricted boards: only users who are viewers, editors, or owners can see
      if (board.visibility === "restricted") {
        if (!isAuthenticated) {
          continue;
        }
        const isViewer = await isUserViewer(ctx, board._id, identity.subject);
        if (isViewer) {
          filteredBoards.push(board);
        }
      }
    }

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
 * Restricted boards require user to be in viewerIds.
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
      visibility: v.union(
        v.literal("public"),
        v.literal("private"),
        v.literal("restricted")
      ),
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
    if (board.visibility === "private") {
      if (!identity || identity.org_id !== board.organizationId) {
        return null;
      }
      return {
        ...board,
        updatedAt: board.updatedAt ?? board._creationTime,
      };
    }

    // Restricted boards require user to be a viewer, editor, or owner
    if (board.visibility === "restricted") {
      if (!identity || identity.org_id !== board.organizationId) {
        return null;
      }
      const isViewer = await isUserViewer(ctx, args.boardId, identity.subject);
      if (!isViewer) {
        return null;
      }
      return {
        ...board,
        updatedAt: board.updatedAt ?? board._creationTime,
      };
    }

    return null;
  },
});

/**
 * Check if current user can edit a board.
 * Returns true if user is owner or editor.
 */
export const canEdit = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return false;
    }

    return await isUserEditor(ctx, args.boardId, identity.subject);
  },
});

/**
 * Check if current user is a board owner.
 */
export const isOwner = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return false;
    }

    return await isUserOwner(ctx, args.boardId, identity.subject);
  },
});

/**
 * Get list of user IDs who can edit the board (owners + editors).
 */
export const getEditors = query({
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

    return await getBoardEditors(ctx, args.boardId);
  },
});

/**
 * Get list of user IDs who own the board.
 */
export const getOwners = query({
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

    return await getBoardOwners(ctx, args.boardId);
  },
});

/**
 * Get list of user IDs who can view a restricted board.
 */
export const getViewers = query({
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

    return await getBoardViewers(ctx, args.boardId);
  },
});

/**
 * Add a user to a restricted board's viewerIds array.
 * Only owners or editors can add viewers.
 */
export const addViewer = mutation({
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

    // Check if user is owner or editor
    await requireOwnerOrEditor(
      ctx,
      args.boardId,
      identity.subject,
      "Unauthorized: Only owners or editors can add viewers"
    );

    if (board.visibility !== "restricted") {
      throw new Error("Can only add viewers to restricted boards");
    }

    // Check if already a viewer, editor, or owner
    const existingMember = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (existingMember) {
      if (existingMember.role === "viewer") {
        return null; // Already a viewer
      }
      if (existingMember.role === "owner" || existingMember.role === "editor") {
        return null; // Owner/editor is already implicitly a viewer
      }
    }

    // Ensure owners are always in viewerIds (they're already owners, so skip)
    const ownerIds = await getBoardOwners(ctx, args.boardId);
    if (ownerIds.includes(args.userId)) {
      return null; // Owner is already implicitly a viewer
    }

    await setBoardMember(
      ctx,
      args.boardId,
      args.userId,
      "viewer",
      identity.org_id as string
    );
    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    // Auto-subscribe user to board
    await ctx.scheduler.runAfter(0, internal.activity.subscribeUserToBoard, {
      boardId: args.boardId,
      userId: args.userId,
      organizationId: identity.org_id as string,
    });

    // Log event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "user_added_to_board",
      actorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      metadata: {
        targetUserId: args.userId,
        boardName: board.name,
      },
    });

    return null;
  },
});

/**
 * Remove a user from a restricted board's viewerIds array.
 * Only owners or editors can remove viewers.
 * Cannot remove owners.
 */
export const removeViewer = mutation({
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

    // Check if user is owner or editor
    await requireOwnerOrEditor(
      ctx,
      args.boardId,
      identity.subject,
      "Unauthorized: Only owners or editors can remove viewers"
    );

    // Cannot remove owners
    const ownerIds = await getBoardOwners(ctx, args.boardId);
    if (ownerIds.includes(args.userId)) {
      throw new Error("Cannot remove owners from viewers");
    }

    const existingMember = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!existingMember || existingMember.role !== "viewer") {
      return null; // Not a viewer
    }

    await removeBoardMember(ctx, args.boardId, args.userId);
    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Add a user to board's editorIds array.
 * Only owners or editors can add editors.
 */
export const addEditor = mutation({
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

    // Check if user is owner or editor
    await requireOwnerOrEditor(
      ctx,
      args.boardId,
      identity.subject,
      "Unauthorized: Only owners or editors can add editors"
    );

    // Owners are already editors, don't add them
    const ownerIds = await getBoardOwners(ctx, args.boardId);
    if (ownerIds.includes(args.userId)) {
      return null;
    }

    const existingMember = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (existingMember && existingMember.role === "editor") {
      return null; // Already an editor
    }

    await setBoardMember(
      ctx,
      args.boardId,
      args.userId,
      "editor",
      identity.org_id as string
    );
    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    // Auto-subscribe user to board
    await ctx.scheduler.runAfter(0, internal.activity.subscribeUserToBoard, {
      boardId: args.boardId,
      userId: args.userId,
      organizationId: identity.org_id as string,
    });

    // Log event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "user_added_as_board_editor",
      actorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      metadata: {
        targetUserId: args.userId,
        boardName: board.name,
      },
    });

    return null;
  },
});

/**
 * Remove a user from board's editorIds array.
 * Only owners or editors can remove editors.
 * Cannot remove owners.
 */
export const removeEditor = mutation({
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

    // Check if user is owner or editor
    await requireOwnerOrEditor(
      ctx,
      args.boardId,
      identity.subject,
      "Unauthorized: Only owners or editors can remove editors"
    );

    // Cannot remove owners
    const ownerIds = await getBoardOwners(ctx, args.boardId);
    if (ownerIds.includes(args.userId)) {
      throw new Error("Cannot remove owners from editors");
    }

    const existingMember = await ctx.db
      .query("boardMembers")
      .withIndex("by_boardId_and_userId", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!existingMember || existingMember.role !== "editor") {
      return null; // Not an editor
    }

    await removeBoardMember(ctx, args.boardId, args.userId);
    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    // Log event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "user_removed_as_board_editor",
      actorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      metadata: {
        targetUserId: args.userId,
        boardName: board.name,
      },
    });

    return null;
  },
});

/**
 * Add a user to board's ownerIds array.
 * Only owners can add owners.
 */
export const addOwner = mutation({
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

    // Only owners can add owners
    const userIsOwner = await isUserOwner(ctx, args.boardId, identity.subject);
    if (!userIsOwner) {
      throw new Error("Unauthorized: Only owners can add owners");
    }

    const ownerIds = await getBoardOwners(ctx, args.boardId);
    if (ownerIds.includes(args.userId)) {
      return null; // Already an owner
    }

    await setBoardMember(
      ctx,
      args.boardId,
      args.userId,
      "owner",
      identity.org_id as string
    );
    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    // Ensure new owner is a viewer if board is restricted (owners are implicitly viewers)
    // This is handled by the role hierarchy, but we ensure the member exists

    // Auto-subscribe new owner to board
    await ctx.scheduler.runAfter(0, internal.activity.subscribeUserToBoard, {
      boardId: args.boardId,
      userId: args.userId,
      organizationId: identity.org_id as string,
    });

    // Log event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "user_added_as_board_owner",
      actorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      metadata: {
        targetUserId: args.userId,
        boardName: board.name,
      },
    });

    return null;
  },
});

/**
 * Remove a user from board's ownerIds array.
 * Only owners can remove owners.
 * Must maintain at least 1 owner.
 * Owners cannot remove themselves.
 */
export const removeOwner = mutation({
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

    // Only owners can remove owners
    const userIsOwner = await isUserOwner(ctx, args.boardId, identity.subject);
    if (!userIsOwner) {
      throw new Error("Unauthorized: Only owners can remove owners");
    }

    const ownerIds = await getBoardOwners(ctx, args.boardId);
    // Cannot remove if it would leave board with 0 owners
    if (ownerIds.length <= 1) {
      throw new Error("Cannot remove the last owner");
    }

    // Owners cannot remove themselves
    if (args.userId === identity.subject) {
      throw new Error("Owners cannot remove themselves");
    }

    if (!ownerIds.includes(args.userId)) {
      return null; // Not an owner
    }

    await removeBoardMember(ctx, args.boardId, args.userId);
    await ctx.db.patch(args.boardId, {
      updatedAt: Date.now(),
    });

    // Log event
    await ctx.scheduler.runAfter(0, internal.activity.logEvent, {
      eventType: "user_removed_as_board_owner",
      actorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      metadata: {
        targetUserId: args.userId,
        boardName: board.name,
      },
    });

    return null;
  },
});

/**
 * Delete a board and all its cards.
 * Requires authentication and org membership.
 * Only owners can delete a board.
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

    // Only owners can delete a board
    const userIsOwner = await isUserOwner(ctx, args.boardId, identity.subject);
    if (!userIsOwner) {
      throw new Error("Unauthorized: Only owners can delete a board");
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
