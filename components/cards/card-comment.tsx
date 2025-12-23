"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Remark } from "react-remark";
import { useMutation } from "convex/react";
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
import { MemberAvatar, getAuthorDisplayInfo, formatDate } from "./card-details";

const editCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

type EditCommentValues = z.infer<typeof editCommentSchema>;

interface Comment {
  _id: Id<"comments">;
  _creationTime: number;
  authorId: string;
  content: string;
  updatedAt?: number;
}

interface CardCommentProps {
  comment: Comment;
  members: OrganizationMember[];
  currentUserId: string;
}

export function CardComment({
  comment,
  members,
  currentUserId,
}: CardCommentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateComment = useMutation(api.comments.update);
  const removeComment = useMutation(api.comments.remove);

  const authorInfo = getAuthorDisplayInfo(comment.authorId, members);
  const isAuthor = comment.authorId === currentUserId;
  const wasEdited =
    comment.updatedAt && comment.updatedAt > comment._creationTime;

  const form = useForm<EditCommentValues>({
    resolver: zodResolver(editCommentSchema),
    defaultValues: {
      content: comment.content,
    },
  });

  const handleSave = async (values: EditCommentValues) => {
    try {
      await updateComment({
        commentId: comment._id,
        content: values.content,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeComment({ commentId: comment._id });
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    form.reset({ content: comment.content });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3 border rounded-md p-4 bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {authorInfo.member ? (
            <>
              <MemberAvatar member={authorInfo.member} className="h-6 w-6" />
              <span className="text-foreground font-medium">
                {authorInfo.displayName}
              </span>
            </>
          ) : (
            <span>{authorInfo.displayName}</span>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-3">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LexicalEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Edit your comment..."
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
                disabled={form.formState.isSubmitting || isDeleting}
              >
                {form.formState.isSubmitting ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : null}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={form.formState.isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={form.formState.isSubmitting || isDeleting}
                className="ml-auto"
              >
                {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Delete
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div
      className={`space-y-2 border rounded-md p-4 bg-background ${
        isAuthor ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
      }`}
      onClick={isAuthor ? () => setIsEditing(true) : undefined}
      role={isAuthor ? "button" : undefined}
      tabIndex={isAuthor ? 0 : undefined}
      onKeyDown={
        isAuthor
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsEditing(true);
              }
            }
          : undefined
      }
    >
      {/* Author and timestamp */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {authorInfo.member ? (
          <>
            <MemberAvatar member={authorInfo.member} className="h-6 w-6" />
            <span className="text-foreground font-medium">
              {authorInfo.displayName}
            </span>
          </>
        ) : (
          <span>{authorInfo.displayName}</span>
        )}
        <span>·</span>
        <span>{formatDate(comment._creationTime)}</span>
        {wasEdited && <span className="text-xs italic">(edited)</span>}
      </div>

      {/* Comment content */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <Remark
          rehypeReactOptions={{
            components: {
              h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
                <h1 className="font-black text-2xl" {...props} />
              ),
              h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
                <h2 className="font-bold text-xl" {...props} />
              ),
              ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
                <ul className="list-disc list-inside pl-2" {...props} />
              ),
              ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
                <ol className="list-decimal list-inside pl-2" {...props} />
              ),
              a: (props: React.HTMLAttributes<HTMLAnchorElement>) => (
                <a
                  className="text-blue-600 underline hover:text-blue-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  {...props}
                />
              ),
              p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
                <p {...props} />
              ),
              em: (props: React.HTMLAttributes<HTMLElement>) => (
                <em className="italic" {...props} />
              ),
            },
          }}
        >
          {comment.content}
        </Remark>
      </div>

      {isAuthor && (
        <p className="text-xs text-muted-foreground italic">Click to edit</p>
      )}
    </div>
  );
}
