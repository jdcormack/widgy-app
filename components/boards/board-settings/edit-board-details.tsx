"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VisibilityBadge } from "@/components/boards/visibility-badge";
import { NotebookIcon } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Board name is required")
    .max(100, "Board name is too long"),
  visibility: z.enum(["public", "private", "restricted"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EditBoardDetailsProps {
  boardId: Id<"boards">;
  board: {
    name: string;
    visibility: "public" | "private" | "restricted";
  };
}

export function EditBoardDetails({ boardId, board }: EditBoardDetailsProps) {
  const canEdit = useQuery(api.boards.canEdit, { boardId });
  const boardMembers = useQuery(api.boards.getAllMembers, { boardId });
  const updateBoard = useMutation(api.boards.update);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: board.name,
      visibility: board.visibility,
    },
  });

  const onSubmit = async (values: FormValues) => {
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
        boardId,
        name: values.name,
        visibility: values.visibility,
        viewerIds: values.visibility === "restricted" ? viewerIds : undefined,
        editorIds,
      });
    } catch (error) {
      console.error("Failed to update board:", error);
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <NotebookIcon /> Details
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : "Save changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
