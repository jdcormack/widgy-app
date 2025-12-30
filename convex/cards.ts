import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Create a new empty card.
 * Sets the authorId to the current user automatically.
 * Optionally accepts a boardId and status for kanban boards.
 */
export const create = mutation({
  args: {
    boardId: v.optional(v.id("boards")),
    status: v.optional(v.string()),
  },
  returns: v.id("cards"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to create a card");
    }

    const cardId = await ctx.db.insert("cards", {
      title: "",
      description: "",
      authorId: identity.subject,
      boardId: args.boardId,
      organizationId: identity.org_id as string,
      assignedTo: undefined,
      status: args.status ?? "someday",
      updatedAt: Date.now(),
    });

    // Record creation in activity log + feed.
    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId,
      boardId: args.boardId,
      actorId: identity.subject,
      kind: "card_created",
      payload: undefined,
      boardContextIds: args.boardId ? [args.boardId] : [],
    });

    // Update board timestamp if card is added to a board
    if (args.boardId) {
      await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
        boardId: args.boardId,
      });
    }

    return cardId;
  },
});

const cardValidator = v.object({
  _id: v.id("cards"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  authorId: v.string(),
  boardId: v.optional(v.id("boards")),
  organizationId: v.string(),
  assignedTo: v.optional(v.string()),
  status: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
});

const cardWithBoardValidator = v.object({
  _id: v.id("cards"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.string(),
  authorId: v.string(),
  boardId: v.optional(v.id("boards")),
  organizationId: v.string(),
  assignedTo: v.optional(v.string()),
  status: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
  boardName: v.optional(v.string()),
});

/**
 * List cards for an organization with pagination.
 * Returns 20 cards per page, sorted by creation time descending.
 * Requires authentication and org membership.
 */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(cardWithBoardValidator),
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

    // Require authentication with org membership
    if (!identity || !identity.org_id) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const results = await ctx.db
      .query("cards")
      .withIndex("by_organizationId", (q) =>
        q.eq("organizationId", identity.org_id as string)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // Fetch board names for cards that have a boardId
    const cardsWithBoards = await Promise.all(
      results.page.map(async (card) => {
        if (card.boardId) {
          const board = await ctx.db.get(card.boardId);
          return { ...card, boardName: board?.name };
        }
        return { ...card, boardName: undefined };
      })
    );

    return {
      ...results,
      page: cardsWithBoards,
    };
  },
});

/**
 * List unassigned cards (cards not on any board) for an organization with pagination.
 * Returns cards sorted by creation time descending.
 * Requires authentication and org membership.
 */
export const listUnassigned = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(cardValidator),
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

    // Require authentication with org membership
    if (!identity || !identity.org_id) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    const organizationId = identity.org_id as string;

    // Query cards with undefined boardId using the by_boardId index
    const results = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", undefined))
      .order("desc")
      .paginate(args.paginationOpts);

    // Filter to current org only (since the index doesn't include organizationId)
    const orgCards = results.page.filter(
      (card) => card.organizationId === organizationId
    );

    return {
      ...results,
      page: orgCards,
    };
  },
});

/**
 * Get a single card by ID.
 * Returns null if card doesn't exist or user doesn't have access.
 */
export const getById = query({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.union(cardValidator, v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.org_id) {
      return null;
    }

    const card = await ctx.db.get(args.cardId);
    if (!card || card.organizationId !== identity.org_id) {
      return null;
    }

    return card;
  },
});

/**
 * Update a card's details.
 * Requires authentication.
 */
export const update = mutation({
  args: {
    cardId: v.id("cards"),
    title: v.string(),
    description: v.string(),
    boardId: v.optional(v.id("boards")),
    assignedTo: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to update a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot update card from another organization"
      );
    }

    const oldBoardId = card.boardId;
    const newBoardId = args.boardId;
    const oldStatus = card.status;
    const oldAssignedTo = card.assignedTo;
    const oldTitle = card.title;

    // Only include fields that are explicitly provided to avoid overwriting with undefined
    const updates: {
      title: string;
      description: string;
      updatedAt: number;
      boardId?: typeof args.boardId;
      assignedTo?: typeof args.assignedTo;
      status?: typeof args.status;
    } = {
      title: args.title,
      description: args.description,
      updatedAt: Date.now(),
    };

    // Only update optional fields if they are explicitly provided in args
    if ("boardId" in args) {
      updates.boardId = args.boardId;
    }
    if ("assignedTo" in args) {
      updates.assignedTo = args.assignedTo;
    }
    if ("status" in args && args.status !== undefined) {
      updates.status = args.status;
    }

    await ctx.db.patch(args.cardId, updates);

    // Record activity events (scheduled to avoid slowing the mutation).
    if (args.title !== oldTitle) {
      await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
        organizationId: identity.org_id as string,
        cardId: args.cardId,
        boardId: newBoardId ?? oldBoardId,
        actorId: identity.subject,
        kind: "card_title_changed",
        payload: { title: args.title },
        boardContextIds: (newBoardId ?? oldBoardId) ? [newBoardId ?? oldBoardId!] : [],
      });
    }

    if (
      "assignedTo" in args &&
      args.assignedTo !== undefined &&
      args.assignedTo !== oldAssignedTo
    ) {
      await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
        organizationId: identity.org_id as string,
        cardId: args.cardId,
        boardId: newBoardId ?? oldBoardId,
        actorId: identity.subject,
        kind: "card_assignee_changed",
        payload: { toAssignee: args.assignedTo ?? null },
        boardContextIds: (newBoardId ?? oldBoardId) ? [newBoardId ?? oldBoardId!] : [],
      });
    }

    if (
      "status" in args &&
      args.status !== undefined &&
      args.status !== oldStatus
    ) {
      await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
        organizationId: identity.org_id as string,
        cardId: args.cardId,
        boardId: newBoardId ?? oldBoardId,
        actorId: identity.subject,
        kind: "card_status_changed",
        payload: { toStatus: args.status },
        boardContextIds: (newBoardId ?? oldBoardId) ? [newBoardId ?? oldBoardId!] : [],
      });
    }

    if ("boardId" in args && newBoardId !== oldBoardId) {
      const boardContextIds = [
        ...(oldBoardId ? [oldBoardId] : []),
        ...(newBoardId ? [newBoardId] : []),
      ];

      await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
        organizationId: identity.org_id as string,
        cardId: args.cardId,
        boardId: newBoardId,
        actorId: identity.subject,
        kind: "card_board_changed",
        payload: {
          fromBoardId: oldBoardId ?? null,
          toBoardId: newBoardId ?? null,
        },
        boardContextIds,
      });
    }

    // Update board timestamps for affected boards
    if (oldBoardId) {
      await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
        boardId: oldBoardId,
      });
    }
    if (newBoardId && newBoardId !== oldBoardId) {
      await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
        boardId: newBoardId,
      });
    }

    return null;
  },
});

/**
 * Delete a card.
 * Requires authentication and org membership.
 */
export const remove = mutation({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to delete a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot delete card from another organization"
      );
    }

    // Update board timestamp if card was on a board
    if (card.boardId) {
      await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
        boardId: card.boardId,
      });
    }

    // Record deletion in activity log + feed.
    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId: args.cardId,
      boardId: card.boardId,
      actorId: identity.subject,
      kind: "card_deleted",
      payload: { deletedTitle: card.title },
      boardContextIds: card.boardId ? [card.boardId] : [],
    });

    await ctx.db.delete(args.cardId);

    return null;
  },
});

/**
 * List cards for a specific board.
 * Public boards can be viewed by anyone.
 * Private boards require authentication and org membership.
 */
export const listByBoard = query({
  args: {
    boardId: v.id("boards"),
  },
  returns: v.array(cardValidator),
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      return [];
    }

    const identity = await ctx.auth.getUserIdentity();

    // Check access for private boards
    if (board.visibility === "private") {
      if (!identity || identity.org_id !== board.organizationId) {
        return [];
      }
    }

    const cards = await ctx.db
      .query("cards")
      .withIndex("by_boardId", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Sort by updatedAt descending, falling back to _creationTime for older cards
    return cards.sort(
      (a, b) =>
        (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime)
    );
  },
});

/**
 * Update a card's status (for kanban drag-and-drop).
 * Requires authentication and org membership.
 */
export const updateStatus = mutation({
  args: {
    cardId: v.id("cards"),
    status: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to update a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot update card from another organization"
      );
    }

    await ctx.db.patch(args.cardId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Record status change in activity log + feed.
    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId: args.cardId,
      boardId: card.boardId,
      actorId: identity.subject,
      kind: "card_status_changed",
      payload: { toStatus: args.status },
      boardContextIds: card.boardId ? [card.boardId] : [],
    });

    // Update board timestamp
    if (card.boardId) {
      await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
        boardId: card.boardId,
      });
    }

    return null;
  },
});

/**
 * Assign an unassigned card to a board.
 * Sets the board and status to "someday".
 * Requires authentication and org membership.
 */
export const assignToBoard = mutation({
  args: {
    cardId: v.id("cards"),
    boardId: v.id("boards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to assign a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot assign card from another organization"
      );
    }

    // Verify the board exists and belongs to the same organization
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    if (board.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot assign card to board from another organization"
      );
    }

    await ctx.db.patch(args.cardId, {
      boardId: args.boardId,
      status: "someday",
      updatedAt: Date.now(),
    });

    // Record board move + status reset in activity log + feed.
    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId: args.cardId,
      boardId: args.boardId,
      actorId: identity.subject,
      kind: "card_board_changed",
      payload: { fromBoardId: card.boardId ?? null, toBoardId: args.boardId },
      boardContextIds: [
        ...(card.boardId ? [card.boardId] : []),
        args.boardId,
      ],
    });

    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId: args.cardId,
      boardId: args.boardId,
      actorId: identity.subject,
      kind: "card_status_changed",
      payload: { toStatus: "someday" },
      boardContextIds: [args.boardId],
    });

    // Update board timestamp
    await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
      boardId: args.boardId,
    });

    return null;
  },
});

/**
 * Unassign a card from its board (return to unassigned).
 * Removes the boardId and resets status to "someday".
 * Requires authentication and org membership.
 */
export const unassignFromBoard = mutation({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      throw new Error("Unauthorized: Must be logged in to unassign a card");
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new Error("Card not found");
    }

    if (card.organizationId !== identity.org_id) {
      throw new Error(
        "Unauthorized: Cannot unassign card from another organization"
      );
    }

    const oldBoardId = card.boardId;

    await ctx.db.patch(args.cardId, {
      boardId: undefined,
      status: "someday",
      updatedAt: Date.now(),
    });

    // Record unassignment (move out of board) + status reset.
    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId: args.cardId,
      boardId: undefined,
      actorId: identity.subject,
      kind: "card_board_changed",
      payload: { fromBoardId: oldBoardId ?? null, toBoardId: null },
      boardContextIds: oldBoardId ? [oldBoardId] : [],
    });

    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: identity.org_id as string,
      cardId: args.cardId,
      boardId: undefined,
      actorId: identity.subject,
      kind: "card_status_changed",
      payload: { toStatus: "someday" },
      boardContextIds: oldBoardId ? [oldBoardId] : [],
    });

    // Update old board timestamp
    if (oldBoardId) {
      await ctx.scheduler.runAfter(0, internal.boards.updateTimestamp, {
        boardId: oldBoardId,
      });
    }

    return null;
  },
});

/**
 * Search cards by title and description.
 * Searches both fields and merges results, removing duplicates.
 * Returns up to 10 results for command menu display.
 * Requires authentication and org membership.
 */
export const search = query({
  args: {
    query: v.string(),
  },
  returns: v.array(cardWithBoardValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !identity.org_id) {
      return [];
    }

    // Don't search if query is empty or too short
    if (args.query.trim().length < 1) {
      return [];
    }

    const organizationId = identity.org_id as string;

    // Search by title
    const titleResults = await ctx.db
      .query("cards")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("organizationId", organizationId)
      )
      .take(10);

    // Search by description
    const descriptionResults = await ctx.db
      .query("cards")
      .withSearchIndex("search_description", (q) =>
        q.search("description", args.query).eq("organizationId", organizationId)
      )
      .take(10);

    // Merge and deduplicate results
    const seenIds = new Set<string>();
    const mergedResults: Array<(typeof titleResults)[number]> = [];

    for (const card of [...titleResults, ...descriptionResults]) {
      if (!seenIds.has(card._id)) {
        seenIds.add(card._id);
        mergedResults.push(card);
      }
    }

    // Fetch board names for cards and return up to 10 results
    const resultsWithBoards = await Promise.all(
      mergedResults.slice(0, 10).map(async (card) => {
        if (card.boardId) {
          const board = await ctx.db.get(card.boardId);
          return { ...card, boardName: board?.name };
        }
        return { ...card, boardName: undefined };
      })
    );

    return resultsWithBoards;
  },
});

/**
 * Create a feedback card from the public feedback API.
 * Does not require authentication - called from the feedback API endpoint.
 * The API endpoint handles rate limiting and org verification.
 */
export const createFeedback = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    email: v.string(),
    organizationId: v.string(),
  },
  returns: v.id("cards"),
  handler: async (ctx, args) => {
    const cardId = await ctx.db.insert("cards", {
      title: args.title,
      description: args.description,
      authorId: `feedback:${args.email}`,
      organizationId: args.organizationId,
      status: "someday",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.cardEvents.log, {
      organizationId: args.organizationId,
      cardId,
      boardId: undefined,
      actorId: `feedback:${args.email}`,
      kind: "card_created",
      payload: undefined,
      boardContextIds: [],
    });

    return cardId;
  },
});
