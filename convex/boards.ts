import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

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

    // Set ownerIds - default to creator if not provided, must have at least 1
    const ownerIds =
      args.ownerIds && args.ownerIds.length > 0
        ? args.ownerIds
        : [identity.subject];

    // Handle restricted boards - ensure owners are always included
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
      organizationId: identity.org_id as string,
      visibility: args.visibility,
      createdBy: identity.subject,
      ownerIds,
      viewerIds: args.visibility === "restricted" ? finalViewerIds : undefined,
      editorIds: args.editorIds,
      updatedAt: Date.now(),
    });

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
        organizationId: identity.org_id as string,
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
            organizationId: identity.org_id as string,
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
            organizationId: identity.org_id as string,
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
    const isOwner = board.ownerIds.includes(identity.subject);
    const isEditor = board.editorIds?.includes(identity.subject) ?? false;
    if (!isOwner && !isEditor) {
      throw new Error(
        "Unauthorized: Only owners or editors can update a board"
      );
    }

    const ownerIdsSet = new Set(board.ownerIds);
    const oldVisibility = board.visibility as
      | "public"
      | "private"
      | "restricted";
    const oldViewerIds = board.viewerIds ?? [];
    const oldEditorIds = board.editorIds ?? [];
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
      for (const ownerId of board.ownerIds) {
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
      for (const ownerId of board.ownerIds) {
        if (!newEditorIds.includes(ownerId)) {
          newEditorIds.push(ownerId);
        }
      }
    }

    // Update the board
    await ctx.db.patch(args.boardId, {
      name: args.name,
      visibility: visibility,
      viewerIds: newViewerIds,
      editorIds: newEditorIds,
      updatedAt: Date.now(),
    });

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
      ownerIds: v.array(v.string()),
      viewerIds: v.optional(v.array(v.string())),
      editorIds: v.optional(v.array(v.string())),
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
    const filteredBoards = allBoards.filter((board) => {
      // Public boards: anyone can see
      if (board.visibility === "public") {
        return true;
      }

      // Private boards: authenticated org members can see
      if (board.visibility === "private") {
        return isAuthenticated;
      }

      // Restricted boards: only users in viewerIds can see
      if (board.visibility === "restricted") {
        if (!isAuthenticated) {
          return false;
        }
        const viewerIds = board.viewerIds ?? [];
        return viewerIds.includes(identity.subject);
      }

      return false;
    });

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
      ownerIds: v.array(v.string()),
      viewerIds: v.optional(v.array(v.string())),
      editorIds: v.optional(v.array(v.string())),
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

    // Restricted boards require user to be in viewerIds
    if (board.visibility === "restricted") {
      if (!identity || identity.org_id !== board.organizationId) {
        return null;
      }
      const viewerIds = board.viewerIds ?? [];
      if (!viewerIds.includes(identity.subject)) {
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

    const isOwner = board.ownerIds.includes(identity.subject);
    const isEditor = board.editorIds?.includes(identity.subject) ?? false;
    return isOwner || isEditor;
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

    return board.ownerIds.includes(identity.subject);
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

    const editors = new Set(board.ownerIds);
    if (board.editorIds) {
      board.editorIds.forEach((id) => editors.add(id));
    }
    return Array.from(editors);
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

    return board.ownerIds;
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
    const isOwner = board.ownerIds.includes(identity.subject);
    const isEditor = board.editorIds?.includes(identity.subject) ?? false;
    if (!isOwner && !isEditor) {
      throw new Error("Unauthorized: Only owners or editors can add viewers");
    }

    if (board.visibility !== "restricted") {
      throw new Error("Can only add viewers to restricted boards");
    }

    const viewerIds = board.viewerIds ?? [];
    if (viewerIds.includes(args.userId)) {
      return null; // Already a viewer
    }

    // Ensure owners are always in viewerIds
    const ownerIdsSet = new Set(board.ownerIds);
    if (ownerIdsSet.has(args.userId)) {
      return null; // Owner is already implicitly a viewer
    }

    viewerIds.push(args.userId);
    await ctx.db.patch(args.boardId, {
      viewerIds,
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
    const isOwner = board.ownerIds.includes(identity.subject);
    const isEditor = board.editorIds?.includes(identity.subject) ?? false;
    if (!isOwner && !isEditor) {
      throw new Error(
        "Unauthorized: Only owners or editors can remove viewers"
      );
    }

    // Cannot remove owners
    if (board.ownerIds.includes(args.userId)) {
      throw new Error("Cannot remove owners from viewers");
    }

    const viewerIds = board.viewerIds ?? [];
    if (!viewerIds.includes(args.userId)) {
      return null; // Not a viewer
    }

    const updatedViewerIds = viewerIds.filter((id) => id !== args.userId);
    await ctx.db.patch(args.boardId, {
      viewerIds: updatedViewerIds,
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
    const isOwner = board.ownerIds.includes(identity.subject);
    const isEditor = board.editorIds?.includes(identity.subject) ?? false;
    if (!isOwner && !isEditor) {
      throw new Error("Unauthorized: Only owners or editors can add editors");
    }

    // Owners are already editors, don't add them
    if (board.ownerIds.includes(args.userId)) {
      return null;
    }

    const editorIds = board.editorIds ?? [];
    if (editorIds.includes(args.userId)) {
      return null; // Already an editor
    }

    editorIds.push(args.userId);
    await ctx.db.patch(args.boardId, {
      editorIds,
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
    const isOwner = board.ownerIds.includes(identity.subject);
    const isEditor = board.editorIds?.includes(identity.subject) ?? false;
    if (!isOwner && !isEditor) {
      throw new Error(
        "Unauthorized: Only owners or editors can remove editors"
      );
    }

    // Cannot remove owners
    if (board.ownerIds.includes(args.userId)) {
      throw new Error("Cannot remove owners from editors");
    }

    const editorIds = board.editorIds ?? [];
    if (!editorIds.includes(args.userId)) {
      return null; // Not an editor
    }

    const updatedEditorIds = editorIds.filter((id) => id !== args.userId);
    await ctx.db.patch(args.boardId, {
      editorIds: updatedEditorIds,
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
    if (!board.ownerIds.includes(identity.subject)) {
      throw new Error("Unauthorized: Only owners can add owners");
    }

    if (board.ownerIds.includes(args.userId)) {
      return null; // Already an owner
    }

    const updatedOwnerIds = [...board.ownerIds, args.userId];
    await ctx.db.patch(args.boardId, {
      ownerIds: updatedOwnerIds,
      updatedAt: Date.now(),
    });

    // Ensure new owner is in viewerIds (if restricted) and editorIds
    if (board.visibility === "restricted") {
      const viewerIds = board.viewerIds ?? [];
      if (!viewerIds.includes(args.userId)) {
        viewerIds.push(args.userId);
        await ctx.db.patch(args.boardId, {
          viewerIds,
        });
      }
    }

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
    if (!board.ownerIds.includes(identity.subject)) {
      throw new Error("Unauthorized: Only owners can remove owners");
    }

    // Cannot remove if it would leave board with 0 owners
    if (board.ownerIds.length <= 1) {
      throw new Error("Cannot remove the last owner");
    }

    // Owners cannot remove themselves
    if (args.userId === identity.subject) {
      throw new Error("Owners cannot remove themselves");
    }

    if (!board.ownerIds.includes(args.userId)) {
      return null; // Not an owner
    }

    const updatedOwnerIds = board.ownerIds.filter((id) => id !== args.userId);
    await ctx.db.patch(args.boardId, {
      ownerIds: updatedOwnerIds,
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
    if (!board.ownerIds.includes(identity.subject)) {
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
