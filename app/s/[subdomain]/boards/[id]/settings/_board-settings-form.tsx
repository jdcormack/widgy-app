"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GlobeIcon, GlobeLock, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(100, "Board name is too long"),
  isPublic: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface BoardSettingsFormProps {
  preloadedBoard: Preloaded<typeof api.boards.getById>;
}

export function BoardSettingsForm({ preloadedBoard }: BoardSettingsFormProps) {
  const router = useRouter();
  const board = usePreloadedQuery(preloadedBoard);
  const updateBoard = useMutation(api.boards.update);
  const deleteBoard = useMutation(api.boards.remove);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: board?.name ?? "",
      isPublic: board?.visibility === "public",
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
      await updateBoard({
        boardId: board._id,
        name: values.name,
        visibility: values.isPublic ? "public" : "private",
      });

      router.push(`/boards/${board._id}`);
    } catch (error) {
      console.error("Failed to update board:", error);
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

  if (board === null) {
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
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-2">
                    <FormLabel>Board visibility</FormLabel>
                    <FormDescription className="flex items-center gap-2">
                      {field.value ? (
                        <>
                          <GlobeIcon className="h-4 w-4 text-green-500" />{" "}
                          Anyone can view this board
                        </>
                      ) : (
                        <>
                          <GlobeLock className="h-4 w-4" /> Board is private
                        </>
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="isBoardPublic"
                      data-testid="isBoardPublic"
                    />
                  </FormControl>
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

        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete board
          </Button>
        </div>

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
