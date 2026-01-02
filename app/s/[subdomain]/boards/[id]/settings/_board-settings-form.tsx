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
import { Button, buttonVariants } from "@/components/ui/button";
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
  GlobeIcon,
  GlobeLock,
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
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const removeViewer = useMutation(api.boards.removeViewer);
  const addEditor = useMutation(api.boards.addEditor);
  const removeEditor = useMutation(api.boards.removeEditor);
  const addOwner = useMutation(api.boards.addOwner);
  const removeOwner = useMutation(api.boards.removeOwner);
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
  const owners = useQuery(
    api.boards.getOwners,
    board ? { boardId: board._id } : "skip"
  );
  const editors = useQuery(
    api.boards.getEditors,
    board ? { boardId: board._id } : "skip"
  );
  const viewers = useQuery(
    api.boards.getViewers,
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
  const [viewerSelectorOpen, setViewerSelectorOpen] = useState(false);
  const [editorSelectorOpen, setEditorSelectorOpen] = useState(false);
  const [ownerSelectorOpen, setOwnerSelectorOpen] = useState(false);
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
      const viewerIds =
        values.visibility === "restricted" ? (viewers ?? []) : undefined;

      await updateBoard({
        boardId: board._id,
        name: values.name,
        visibility: values.visibility,
        viewerIds: values.visibility === "restricted" ? viewerIds : undefined,
      });

      router.push(`/boards/${board._id}`);
    } catch (error) {
      console.error("Failed to update board:", error);
    }
  };

  const handleAddViewer = async (userId: string) => {
    if (!board) return;
    try {
      await addViewer({ boardId: board._id, userId });
      setViewerSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add viewer:", error);
    }
  };

  const handleRemoveViewer = async (userId: string) => {
    if (!board) return;
    try {
      await removeViewer({ boardId: board._id, userId });
    } catch (error) {
      console.error("Failed to remove viewer:", error);
    }
  };

  const handleAddEditor = async (userId: string) => {
    if (!board) return;
    try {
      await addEditor({ boardId: board._id, userId });
      setEditorSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add editor:", error);
    }
  };

  const handleRemoveEditor = async (userId: string) => {
    if (!board) return;
    try {
      await removeEditor({ boardId: board._id, userId });
    } catch (error) {
      console.error("Failed to remove editor:", error);
    }
  };

  const handleAddOwner = async (userId: string) => {
    if (!board) return;
    try {
      await addOwner({ boardId: board._id, userId });
      setOwnerSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add owner:", error);
    }
  };

  const handleRemoveOwner = async (userId: string) => {
    if (!board) return;
    try {
      await removeOwner({ boardId: board._id, userId });
    } catch (error) {
      console.error("Failed to remove owner:", error);
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
    owners === undefined ||
    editors === undefined ||
    viewers === undefined ||
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
                      {field.value === "public" && (
                        <>
                          <GlobeIcon className="h-4 w-4 text-green-500" />{" "}
                          Anyone can view this board
                        </>
                      )}
                      {field.value === "private" && (
                        <>
                          <GlobeLock className="h-4 w-4" /> All authenticated
                          org members can view this board
                        </>
                      )}
                      {field.value === "restricted" && (
                        <>
                          <GlobeLock className="h-4 w-4" /> Only selected
                          members can view this board
                        </>
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

        {board.visibility === "restricted" && canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Board Viewers</CardTitle>
              <CardDescription>
                Viewers who can view this restricted board. Owners are
                automatically included.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {viewers?.length ?? 0} viewer
                    {(viewers?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
                <Popover
                  open={viewerSelectorOpen}
                  onOpenChange={setViewerSelectorOpen}
                >
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add viewer
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
                              const isOwner = owners.includes(m.userId);
                              const isViewer =
                                viewers?.includes(m.userId) ?? false;
                              return !isOwner && !isViewer;
                            })
                            .map((member) => (
                              <CommandItem
                                key={member.userId}
                                onSelect={() => handleAddViewer(member.userId)}
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
              {viewers && viewers.length > 0 && (
                <div className="space-y-2">
                  {viewers.map((userId) => {
                    const member = members.find((m) => m.userId === userId);
                    const isOwnerUser = owners.includes(userId);
                    if (!member) return null;
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
                            {isOwnerUser && (
                              <Badge variant="secondary" className="gap-1">
                                <Crown className="h-3 w-3" />
                                Owner
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!isOwnerUser && canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveViewer(userId)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Board Owners
            </CardTitle>
            <CardDescription>
              {isOwner
                ? "Owners can edit, delete, and manage the board. At least one owner is required."
                : "Board owners have full control over this board."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {owners.length} owner{owners.length !== 1 ? "s" : ""}
                </span>
              </div>
              {isOwner && (
                <Popover
                  open={ownerSelectorOpen}
                  onOpenChange={setOwnerSelectorOpen}
                >
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add owner
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Search members..." />
                      <CommandList>
                        <CommandEmpty>No members found.</CommandEmpty>
                        <CommandGroup>
                          {members
                            .filter((m) => !owners.includes(m.userId))
                            .map((member) => (
                              <CommandItem
                                key={member.userId}
                                onSelect={() => handleAddOwner(member.userId)}
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
            </div>
            {owners.length > 0 && (
              <div className="space-y-2">
                {owners.map((userId) => {
                  const member = members.find((m) => m.userId === userId);
                  if (!member) return null;
                  const isLast = owners.length === 1;
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
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {getMemberDisplayName(member)}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="secondary">You</Badge>
                            )}
                          </div>
                          {member.identifier && (
                            <span className="text-xs text-muted-foreground">
                              {member.identifier}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOwner && !isLast && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveOwner(userId)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Board Editors
              </CardTitle>
              <CardDescription>
                Editors can edit board settings but cannot delete the board.
                Owners are automatically editors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {editors.length} editor{editors.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Popover
                  open={editorSelectorOpen}
                  onOpenChange={setEditorSelectorOpen}
                >
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add editor
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
                              const isOwner = owners.includes(m.userId);
                              const isEditor = editors.includes(m.userId);
                              return !isOwner && !isEditor;
                            })
                            .map((member) => (
                              <CommandItem
                                key={member.userId}
                                onSelect={() => handleAddEditor(member.userId)}
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
              {editors.length > 0 && (
                <div className="space-y-2">
                  {editors.map((userId) => {
                    const member = members.find((m) => m.userId === userId);
                    if (!member) return null;
                    const isOwnerUser = owners.includes(userId);
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
                            {isOwnerUser && (
                              <Badge variant="secondary" className="gap-1">
                                <Crown className="h-3 w-3" />
                                Owner
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!isOwnerUser && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveEditor(userId)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        )}
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
