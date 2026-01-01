"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobeIcon, GlobeLock } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  isPublic: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface FeedbackSettingsFormProps {
  preloadedSettings: Preloaded<typeof api.feedbackSettings.getForOrg>;
}

export function FeedbackSettingsForm({
  preloadedSettings,
}: FeedbackSettingsFormProps) {
  const router = useRouter();
  const settings = usePreloadedQuery(preloadedSettings);
  const updateSettings = useMutation(api.feedbackSettings.update);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isPublic: settings?.visibility === "public",
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/feedback");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        isPublic: settings.visibility === "public",
      });
    }
  }, [settings, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updateSettings({
        visibility: values.isPublic ? "public" : "private",
      });
      toast.success("Settings saved successfully");
      router.push("/feedback");
    } catch (error) {
      console.error("Failed to update settings:", error);
      toast.error("Failed to save settings");
    }
  };

  if (settings === undefined) {
    return (
      <div className="space-y-6">
        <div className="gap-4 max-w-2xl mx-auto mb-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-40 mb-4 mt-2" />
        </div>

        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black mt-2">Feedback Settings</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="isPublic"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-2">
                  <FormLabel>Feedback visibility</FormLabel>
                  <FormDescription className="flex items-center gap-2">
                    {field.value ? (
                      <>
                        <GlobeIcon className="h-4 w-4 text-green-500" /> Anyone
                        can view and vote on feedback
                      </>
                    ) : (
                      <>
                        <GlobeLock className="h-4 w-4" /> Only team members can
                        view feedback
                      </>
                    )}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="isFeedbackPublic"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/feedback">Cancel</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Spinner /> : "Save changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
