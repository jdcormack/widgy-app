"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GlobeIcon, LockIcon, UsersIcon } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { Kbd } from "../ui/kbd";
import { type OrganizationMember } from "@/app/actions";
import { BoardViewersSelector } from "./board-viewers-selector";
import { BoardOwnersSelector } from "./board-owners-selector";
import { BoardEditorsSelector } from "./board-editors-selector";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(100, "Board name is too long"),
  visibility: z.enum(["public", "private", "restricted"]),
  ownerIds: z.array(z.string()).min(1, "At least one owner is required"),
  viewerIds: z.array(z.string()).optional(),
  editorIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateBoardDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  members?: OrganizationMember[];
  onBoardCreated?: (boardId: string) => void;
}

export function CreateBoardDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  members = [],
  onBoardCreated,
}: CreateBoardDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { user } = useUser();
  const createBoard = useMutation(api.boards.create);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const currentUserId = user?.id ?? "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      visibility: "private",
      ownerIds: currentUserId ? [currentUserId] : [],
      viewerIds: [],
      editorIds: [],
    },
  });

  const visibility = form.watch("visibility");
  const ownerIds = form.watch("ownerIds");

  const onSubmit = async (values: FormValues) => {
    if (!currentUserId) {
      console.error("User not authenticated");
      return;
    }

    try {
      const finalOwnerIds =
        values.ownerIds.length > 0 ? values.ownerIds : [currentUserId];
      const boardId = await createBoard({
        name: values.name,
        visibility: values.visibility,
        ownerIds: finalOwnerIds,
        viewerIds:
          values.visibility === "restricted" ? values.viewerIds : undefined,
        editorIds:
          values.editorIds && values.editorIds.length > 0
            ? values.editorIds
            : undefined,
      });

      form.reset({
        name: "",
        visibility: "private",
        ownerIds: currentUserId ? [currentUserId] : [],
        viewerIds: [],
        editorIds: [],
      });
      setOpen(false);
      onBoardCreated?.(boardId);
    } catch (error) {
      console.error("Failed to create board:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new board</DialogTitle>
          <DialogDescription>
            Create a board to organize your tasks. Choose who can view and edit
            it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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

                  <FormDescription>
                    <div className="bg-blue-500 text-white rounded-lg p-2 flex items-center gap-2">
                      {field.value === "public" && (
                        <>
                          <GlobeIcon className="size-4" /> Anyone can view this
                          board
                        </>
                      )}
                      {field.value === "private" && (
                        <>
                          <LockIcon className="size-4" />
                          Only people within your organization can view this
                          board
                        </>
                      )}
                      {field.value === "restricted" && (
                        <>
                          <UsersIcon className="size-4" /> Only selected users
                          can view this board
                        </>
                      )}
                    </div>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {visibility === "restricted" && members.length > 0 && (
              <FormField
                control={form.control}
                name="viewerIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Board Viewers</FormLabel>
                    <FormControl>
                      <BoardViewersSelector
                        members={members}
                        selectedUserIds={field.value ?? []}
                        onChange={field.onChange}
                        excludeUserIds={ownerIds}
                      />
                    </FormControl>
                    <FormDescription>
                      Select which org members can view this board. Owners are
                      automatically included.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {members.length > 0 && (
              <>
                <FormField
                  control={form.control}
                  name="ownerIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Owners</FormLabel>
                      <FormControl>
                        <BoardOwnersSelector
                          members={members}
                          selectedUserIds={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Owners can edit, delete, and manage the board. At least
                        one owner is required.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="editorIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Board Editors</FormLabel>
                      <FormControl>
                        <BoardEditorsSelector
                          members={members}
                          selectedUserIds={field.value ?? []}
                          onChange={field.onChange}
                          excludeUserIds={ownerIds}
                        />
                      </FormControl>
                      <FormDescription>
                        Editors can edit board settings but cannot delete the
                        board. Owners are automatically editors.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
