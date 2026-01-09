"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  usePreloadedQuery,
  useMutation,
  useQuery,
  type Preloaded,
} from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trash2,
  Crown,
  Edit,
  Users,
  UserPlus,
  UserMinus,
  Eye,
  EyeOff,
} from "lucide-react";
import { type OrganizationMember } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getMemberDisplayName } from "@/components/cards/card-details";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { VisibilityBadge } from "@/components/boards/visibility-badge";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(100, "Board name is too long"),
  visibility: z.enum(["public", "private", "restricted"]),
});

type FormValues = z.infer<typeof formSchema>;

interface BoardSettingsFormProps {
  preloadedBoard: Preloaded<typeof api.boards.getById>;
  members: OrganizationMember[];
}

export function BoardSettingsForm({
  preloadedBoard,
  members,
}: BoardSettingsFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const board = usePreloadedQuery(preloadedBoard);
  const updateBoard = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.remove);
  const addViewer = useMutation(api.boards.addViewer);
  const addEditor = useMutation(api.boards.addEditor);
  const setMemberRole = useMutation(api.boards.setMemberRole);
  const removeMember = useMutation(api.boards.removeMember);
  const addBoardWatcher = useMutation(api.activity.addBoardWatcher);
  const removeBoardWatcher = useMutation(api.activity.removeBoardWatcher);
  const subscribeToBoard = useMutation(api.activity.subscribeToBoard);
  const unsubscribeFromBoard = useMutation(api.activity.unsubscribeFromBoard);

  const canEdit = useQuery(
    api.boards.canEdit,
    board ? { boardId: board._id } : "skip"
  );
  const isOwner = useQuery(
    api.boards.isOwner,
    board ? { boardId: board._id } : "skip"
  );
  const boardMembers = useQuery(
    api.boards.getAllMembers,
    board ? { boardId: board._id } : "skip"
  );
  const watchers = useQuery(
    api.activity.getBoardSubscribers,
    board ? { boardId: board._id } : "skip"
  );
  const isSubscribed = useQuery(
    api.activity.isSubscribedToBoard,
    board ? { boardId: board._id } : "skip"
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false);
  const [watcherSelectorOpen, setWatcherSelectorOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: board?.name ?? "",
      visibility: board?.visibility ?? "private",
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push(`/boards/${board?._id}`);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, board?._id]);

  const onSubmit = async (values: FormValues) => {
    if (!board) return;

    try {
      // Get current viewer and editor IDs from boardMembers
      const viewerIds =
        values.visibility === "restricted" && boardMembers
          ? boardMembers.filter((m) => m.role === "viewer").map((m) => m.userId)
          : undefined;

      const editorIds = boardMembers
        ? boardMembers.filter((m) => m.role === "editor").map((m) => m.userId)
        : undefined;

      await updateBoard({
        boardId: board._id,
        name: values.name,
        visibility: values.visibility,
        viewerIds: values.visibility === "restricted" ? viewerIds : undefined,
        editorIds,
      });

      router.push(`/boards/${board._id}`);
    } catch (error) {
      console.error("Failed to update board:", error);
    }
  };

  const handleRoleChange = async (
    userId: string,
    newRole: "owner" | "editor" | "viewer"
  ) => {
    if (!board) return;
    try {
      await setMemberRole({
        boardId: board._id,
        userId,
        newRole,
      });
    } catch (error) {
      console.error("Failed to change role:", error);
      // You might want to show a toast notification here
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!board) return;
    try {
      // For restricted boards, add as viewer; for others, add as editor
      if (board.visibility === "restricted") {
        await addViewer({ boardId: board._id, userId });
      } else {
        await addEditor({ boardId: board._id, userId });
      }
      setMemberSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!board) return;
    try {
      await removeMember({ boardId: board._id, userId });
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  const handleAddWatcher = async (userId: string) => {
    if (!board) return;
    try {
      await addBoardWatcher({ boardId: board._id, userId });
      setWatcherSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add watcher:", error);
    }
  };

  const handleRemoveWatcher = async (userId: string) => {
    if (!board) return;
    try {
      await removeBoardWatcher({ boardId: board._id, userId });
    } catch (error) {
      console.error("Failed to remove watcher:", error);
    }
  };

  const handleToggleSubscription = async () => {
    if (!board) return;
    try {
      if (isSubscribed) {
        await unsubscribeFromBoard({ boardId: board._id });
      } else {
        await subscribeToBoard({ boardId: board._id });
      }
    } catch (error) {
      console.error("Failed to toggle subscription:", error);
    }
  };

  const handleDelete = async () => {
    if (!board || confirmationText !== board.name) return;

    setIsDeleting(true);
    try {
      await deleteBoard({ boardId: board._id });
      router.replace("/boards");
    } catch (error) {
      console.error("Failed to delete board:", error);
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogClose = (open: boolean) => {
    if (!open) {
      setConfirmationText("");
    }
    setDeleteDialogOpen(open);
  };

  if (
    board === null ||
    canEdit === undefined ||
    isOwner === undefined ||
    boardMembers === undefined ||
    watchers === undefined ||
    isSubscribed === undefined
  ) {
    return (
      <div className="space-y-6">
        <div className="gap-4 max-w-2xl mx-auto mb-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-9 w-40 mb-4 mt-2" />
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>

        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black mt-2">Board Settings</h1>
        </div>

        {!canEdit && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                You don't have permission to edit this board. Only owners and
                editors can modify board settings.
              </p>
            </CardContent>
          </Card>
        )}

        {canEdit && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board name</FormLabel>
                    <FormControl>
                      <Input placeholder="My awesome board" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="flex items-center gap-2">
                      <VisibilityBadge visibility={field.value} />
                      {field.value === "public" && (
                        <span>Anyone can view this board</span>
                      )}
                      {field.value === "private" && (
                        <span>
                          All authenticated org members can view this board
                        </span>
                      )}
                      {field.value === "restricted" && (
                        <span>Only selected members can view this board</span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/boards/${board._id}`}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Spinner /> : "Save changes"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Board Members
              </CardTitle>
              <CardDescription>
                Manage board members and their roles. Owners can assign any
                role. Editors can only assign editor or viewer roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {boardMembers?.length ?? 0} member
                    {(boardMembers?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <Popover
                  open={memberSelectorOpen}
                  onOpenChange={setMemberSelectorOpen}
                >
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add member
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search members..." />
                      <CommandList>
                        <CommandEmpty>No members found.</CommandEmpty>
                        <CommandGroup>
                          {members
                            .filter((m) => {
                              const isMember =
                                boardMembers?.some(
                                  (bm) => bm.userId === m.userId
                                ) ?? false;
                              return !isMember;
                            })
                            .map((member) => (
                              <CommandItem
                                key={member.userId}
                                onSelect={() => handleAddMember(member.userId)}
                              >
                                <Avatar className="mr-2 h-6 w-6">
                                  <AvatarImage
                                    src={member.imageUrl ?? undefined}
                                  />
                                  <AvatarFallback>
                                    {getMemberDisplayName(member)
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                {getMemberDisplayName(member)}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {boardMembers && boardMembers.length > 0 && (
                <div className="space-y-2">
                  {boardMembers.map((memberData) => {
                    const member = members.find(
                      (m) => m.userId === memberData.userId
                    );
                    if (!member) return null;

                    const isCurrentUser = memberData.userId === user?.id;
                    const isOwnerRole = memberData.role === "owner";
                    const isEditorRole = memberData.role === "editor";
                    const isViewerRole = memberData.role === "viewer";
                    const ownerCount = boardMembers.filter(
                      (m) => m.role === "owner"
                    ).length;
                    const isLastOwner = isOwnerRole && ownerCount === 1;

                    // Determine available roles based on current user's permissions
                    // Only owners can assign owner role; editors can only assign editor/viewer
                    const canAssignOwner = isOwner === true;
                    const canChangeRole = canEdit === true;

                    // Get available role options based on permissions
                    const availableRoles: Array<{
                      value: "owner" | "editor" | "viewer";
                      label: string;
                      disabled: boolean;
                    }> = [];

                    if (board?.visibility === "restricted") {
                      // For restricted boards, show applicable roles
                      if (canAssignOwner) {
                        // Owners can assign all roles
                        availableRoles.push(
                          {
                            value: "owner",
                            label: "Owner",
                            disabled:
                              (isOwnerRole && isLastOwner) ||
                              (isOwnerRole && isCurrentUser),
                          },
                          {
                            value: "editor",
                            label: "Editor",
                            disabled: false,
                          },
                          {
                            value: "viewer",
                            label: "Viewer",
                            disabled: false,
                          }
                        );
                      } else {
                        // Editors can only assign editor/viewer
                        availableRoles.push(
                          {
                            value: "editor",
                            label: "Editor",
                            disabled: false,
                          },
                          {
                            value: "viewer",
                            label: "Viewer",
                            disabled: false,
                          }
                        );
                      }
                    } else {
                      // For non-restricted boards, only owner and editor (no viewer)
                      if (canAssignOwner) {
                        // Owners can assign owner/editor
                        availableRoles.push(
                          {
                            value: "owner",
                            label: "Owner",
                            disabled:
                              (isOwnerRole && isLastOwner) ||
                              (isOwnerRole && isCurrentUser),
                          },
                          {
                            value: "editor",
                            label: "Editor",
                            disabled: false,
                          }
                        );
                      } else {
                        // Editors can only assign editor
                        availableRoles.push({
                          value: "editor",
                          label: "Editor",
                          disabled: false,
                        });
                      }
                    }

                    return (
                      <div
                        key={memberData.userId}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.imageUrl ?? undefined} />
                            <AvatarFallback>
                              {getMemberDisplayName(member)
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-0.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {getMemberDisplayName(member)}
                              </span>
                              {isCurrentUser && (
                                <Badge variant="secondary">You</Badge>
                              )}
                              {isOwnerRole && (
                                <Badge variant="secondary" className="gap-1">
                                  <Crown className="h-3 w-3" />
                                  Owner
                                </Badge>
                              )}
                              {isEditorRole && !isOwnerRole && (
                                <Badge variant="secondary" className="gap-1">
                                  <Edit className="h-3 w-3" />
                                  Editor
                                </Badge>
                              )}
                              {isViewerRole && (
                                <Badge variant="secondary" className="gap-1">
                                  <Eye className="h-3 w-3" />
                                  Viewer
                                </Badge>
                              )}
                            </div>
                            {member.identifier && (
                              <span className="text-xs text-muted-foreground">
                                {member.identifier}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canChangeRole &&
                            // Editors cannot change owner roles
                            !(isOwnerRole && !canAssignOwner) && (
                              <Select
                                value={memberData.role}
                                onValueChange={(value) =>
                                  handleRoleChange(
                                    memberData.userId,
                                    value as "owner" | "editor" | "viewer"
                                  )
                                }
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map((role) => (
                                    <SelectItem
                                      key={role.value}
                                      value={role.value}
                                      disabled={role.disabled}
                                    >
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          {canChangeRole && isOwnerRole && !canAssignOwner && (
                            <span className="text-xs text-muted-foreground">
                              Owner
                            </span>
                          )}
                          {/* Remove button - only for owners, can't remove self or last owner */}
                          {isOwner &&
                            !isCurrentUser &&
                            (!isOwnerRole || !isLastOwner) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  handleRemoveMember(memberData.userId)
                                }
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Watchers Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Watchers
            </CardTitle>
            <CardDescription>
              Users watching this board will be automatically subscribed to new
              cards and receive activity updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {watchers.length} watcher{watchers.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Popover
                    open={watcherSelectorOpen}
                    onOpenChange={setWatcherSelectorOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add watcher
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Search members..." />
                        <CommandList>
                          <CommandEmpty>No members found.</CommandEmpty>
                          <CommandGroup>
                            {members
                              .filter((m) => !watchers.includes(m.userId))
                              .map((member) => (
                                <CommandItem
                                  key={member.userId}
                                  onSelect={() =>
                                    handleAddWatcher(member.userId)
                                  }
                                >
                                  <Avatar className="mr-2 h-6 w-6">
                                    <AvatarImage
                                      src={member.imageUrl ?? undefined}
                                    />
                                    <AvatarFallback>
                                      {getMemberDisplayName(member)
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {getMemberDisplayName(member)}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <Button
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                  onClick={handleToggleSubscription}
                >
                  {isSubscribed ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unwatch
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Watch
                    </>
                  )}
                </Button>
              </div>
            </div>
            {watchers.length > 0 ? (
              <div className="space-y-2">
                {watchers.map((userId) => {
                  const member = members.find((m) => m.userId === userId);
                  if (!member) return null;
                  const isCurrentUser = userId === user?.id;
                  return (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.imageUrl ?? undefined} />
                          <AvatarFallback>
                            {getMemberDisplayName(member)
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {getMemberDisplayName(member)}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary">You</Badge>
                          )}
                        </div>
                      </div>
                      {!isCurrentUser && canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveWatcher(userId)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No one is watching this board yet.
              </p>
            )}
          </CardContent>
        </Card>

        {isOwner && (
          <div className="max-w-2xl mx-auto flex items-center justify-center">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete board
            </Button>
          </div>
        )}

        <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete board</DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    This action cannot be undone. This will permanently delete
                    the board <strong>{board.name}</strong>.
                  </p>
                  <p className="text-destructive font-medium">
                    All cards in this board will also be permanently deleted.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Please type <strong>{board.name}</strong> to confirm.
              </p>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Enter board name"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDeleteDialogClose(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={confirmationText !== board.name || isDeleting}
              >
                {isDeleting ? <Spinner /> : "Delete board"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
