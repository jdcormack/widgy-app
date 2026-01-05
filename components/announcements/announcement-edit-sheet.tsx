"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { LexicalEditor } from "@/components/editor";
import type { Id } from "@/convex/_generated/dataModel";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  details: z.string().min(1, "Details are required"),
});

type FormValues = z.infer<typeof formSchema>;

interface Announcement {
  _id: Id<"announcements">;
  title: string;
  details: string;
}

interface AnnouncementEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement | null;
}

export function AnnouncementEditSheet({
  open,
  onOpenChange,
  announcement,
}: AnnouncementEditSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateAnnouncement = useMutation(api.announcements.update);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      details: "",
    },
  });

  // Update form when announcement changes
  useEffect(() => {
    if (announcement) {
      form.reset({
        title: announcement.title,
        details: announcement.details,
      });
    }
  }, [announcement, form]);

  const onSubmit = async (values: FormValues) => {
    if (!announcement) return;

    setIsSubmitting(true);
    try {
      await updateAnnouncement({
        announcementId: announcement._id,
        title: values.title,
        details: values.details,
      });
      toast.success("Announcement updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update announcement"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!announcement) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Announcement</SheetTitle>
          <SheetDescription>
            Update the announcement title and details.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Announcement title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <LexicalEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Enter announcement details..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Spinner /> : "Update"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
