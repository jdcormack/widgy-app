"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { type OrganizationMember } from "@/app/actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LexicalEditor } from "@/components/editor";
import { Spinner } from "@/components/ui/spinner";
import { CardComment } from "./card-comment";
import { MemberAvatar, getMemberDisplayName } from "./card-details";
import { MessageSquareIcon } from "lucide-react";

const commentFormSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

interface CardCommentsProps {
  cardId: Id<"cards">;
  preloadedComments: Preloaded<typeof api.comments.listByCard>;
  members: OrganizationMember[];
  currentUserId: string;
}

export function CardComments({
  cardId,
  preloadedComments,
  members,
  currentUserId,
}: CardCommentsProps) {
  const comments = usePreloadedQuery(preloadedComments);
  const createComment = useMutation(api.comments.create);

  const [isAddingComment, setIsAddingComment] = useState(false);

  const currentMember = members.find((m) => m.userId === currentUserId);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleSubmit = async (values: CommentFormValues) => {
    try {
      await createComment({
        cardId,
        content: values.content,
      });
      form.reset();
      setIsAddingComment(false);
    } catch (error) {
      console.error("Failed to create comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsAddingComment(false);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquareIcon className="h-5 w-5" />
        Comments
      </h2>

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CardComment
              key={comment._id}
              comment={comment}
              members={members}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No comments yet. Be the first to comment!
        </p>
      )}

      {/* Add comment form */}
      {isAddingComment ? (
        <div className="space-y-3 border rounded-md p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            {currentMember && (
              <>
                <MemberAvatar member={currentMember} className="h-6 w-6" />
                <span className="font-medium">
                  {getMemberDisplayName(currentMember)}
                </span>
              </>
            )}
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-3"
            >
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <LexicalEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write a comment..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <Spinner className="h-4 w-4 mr-2" />
                  ) : null}
                  Post Comment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsAddingComment(true)}
          className="w-full"
        >
          <MessageSquareIcon className="h-4 w-4 mr-2" />
          Add Comment
        </Button>
      )}
    </div>
  );
}
