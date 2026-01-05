"use client";

import { useEffect, useState } from "react";
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
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  Plus,
  ArrowDownNarrowWide,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  newCategory: z.string().min(1).max(50).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface FeedbackCategoriesFormProps {
  preloadedCategories: Preloaded<
    typeof api.feedbackSettings.getCategoriesForOrg
  >;
}

export function FeedbackCategoriesForm({
  preloadedCategories,
}: FeedbackCategoriesFormProps) {
  const router = useRouter();
  const categories = usePreloadedQuery(preloadedCategories);
  const updateCategories = useMutation(api.feedbackSettings.updateCategories);
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newCategory: "",
    },
  });

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.back();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleAddCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) {
      return;
    }

    if (localCategories.includes(trimmed)) {
      toast.error("Category already exists");
      return;
    }

    if (localCategories.length >= 20) {
      toast.error("Maximum 20 categories allowed");
      return;
    }

    setLocalCategories([...localCategories, trimmed]);
    form.setValue("newCategory", "");
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setLocalCategories(
      localCategories.filter((cat) => cat !== categoryToRemove)
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...localCategories];
    [newCategories[index - 1], newCategories[index]] = [
      newCategories[index],
      newCategories[index - 1],
    ];
    setLocalCategories(newCategories);
  };

  const handleMoveDown = (index: number) => {
    if (index === localCategories.length - 1) return;
    const newCategories = [...localCategories];
    [newCategories[index], newCategories[index + 1]] = [
      newCategories[index + 1],
      newCategories[index],
    ];
    setLocalCategories(newCategories);
  };

  const onSubmit = async (values: FormValues) => {
    if (values.newCategory) {
      handleAddCategory(values.newCategory);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCategories({
        categories: localCategories,
      });
      toast.success("Categories saved successfully");
      router.back();
    } catch (error) {
      console.error("Failed to update categories:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save categories"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCategory = form.getValues("newCategory");
    if (newCategory) {
      handleAddCategory(newCategory);
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  if (categories === undefined) {
    return (
      <div className="space-y-6">
        <div className="gap-4 max-w-2xl mx-auto mb-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-40 mb-4 mt-2" />
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black mt-2">Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Manage feedback categories for your organization
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Feedback Categories</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Customize the categories available when submitting feedback. Maximum
            20 categories. Use the arrows to reorder categories.
          </p>

          <div className="space-y-3">
            {localCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No categories defined. Add a category below to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {localCategories.map((category, index) => (
                  <div
                    key={category}
                    className="flex items-center gap-2 p-3 border rounded-lg"
                  >
                    <p className="capitalize w-full font-medium">{category}</p>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="h-8 w-8"
                    >
                      <ArrowUpNarrowWide className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === localCategories.length - 1}
                      aria-label="Move down"
                      className="h-8 w-8"
                    >
                      <ArrowDownWideNarrow className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCategory(category)}
                      aria-label={`Remove ${category} category`}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Add Category</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="Enter category name"
                            maxLength={50}
                            {...field}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const value = field.value?.trim();
                                if (value) {
                                  handleAddCategory(value);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const value = field.value?.trim();
                            if (value) {
                              handleAddCategory(value);
                            }
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add
                        </Button>
                      </div>
                      <FormDescription>
                        Category names must be unique and 50 characters or less.
                        Maximum 20 categories.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/feedback">Cancel</Link>
          </Button>
          <Button
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await updateCategories({
                  categories: localCategories,
                });
                toast.success("Categories saved successfully");
                router.back();
              } catch (error) {
                console.error("Failed to update categories:", error);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Failed to save categories"
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner /> : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
