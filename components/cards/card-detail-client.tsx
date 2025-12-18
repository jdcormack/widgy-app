"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePreloadedQuery, useMutation, type Preloaded } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { type OrganizationMember } from "@/app/actions";
import { CardDisplay } from "./card-display";
import { CardEditForm, type CardEditFormValues } from "./card-edit-form";
import { CardDisplaySkeleton } from "./card-display-skeleton";
import { DeleteCardButton } from "./delete-card-button";

interface CardDetailClientProps {
  preloadedCard: Preloaded<typeof api.cards.getById>;
  preloadedBoards: Preloaded<typeof api.boards.listByOrganization>;
  members: OrganizationMember[];
}

export function CardDetailClient({
  preloadedCard,
  preloadedBoards,
  members,
}: CardDetailClientProps) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);

  const boards = usePreloadedQuery(preloadedBoards);
  const card = usePreloadedQuery(preloadedCard);
  const updateCard = useMutation(api.cards.update);

  // Keyboard shortcuts: 'e' to enter edit mode, 'Escape' to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (!isEditMode && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        setIsEditMode(true);
      }

      if (!isEditMode && e.key === "Escape") {
        e.preventDefault();
        router.back();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, router]);

  const handleSubmit = async (values: CardEditFormValues) => {
    if (!card) return;
    try {
      await updateCard({
        cardId: card._id,
        title: values.title,
        description: values.description,
        boardId: values.boardId ? (values.boardId as Id<"boards">) : undefined,
        assignedTo: values.assignedTo,
      });
      toast.success("Card saved successfully");
      // Exit edit mode after successful save (only if card had a title)
      if (card?.title) {
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Failed to update card:", error);
      toast.error("Failed to save card");
    }
  };

  const handleCancel = () => {
    if (card?.title) {
      // If card has a title, just exit edit mode
      setIsEditMode(false);
    } else {
      // If card has no title (new card), go back
      router.back();
    }
  };

  if (card === null) {
    return <CardDisplaySkeleton />;
  }

  return (
    <>
      {isEditMode ? (
        <CardEditForm
          card={card}
          boards={boards}
          members={members}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <CardDisplay
          card={card}
          boards={boards}
          members={members}
          onEdit={() => setIsEditMode(true)}
        />
      )}

      <DeleteCardButton className="mt-4" />
    </>
  );
}
