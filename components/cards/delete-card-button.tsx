"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { Trash2Icon } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DeleteCardButtonProps {
  className?: string;
}

export function DeleteCardButton({ className }: DeleteCardButtonProps) {
  const params = useParams<{ id: string }>();
  const cardId = params.id as Id<"cards">;
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const removeCard = useMutation(api.cards.remove);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await removeCard({ cardId });
      toast.success("Card deleted successfully");
      router.back();
    } catch (error) {
      console.error("Failed to delete card:", error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex justify-center">
      <Button
        type="button"
        variant="destructive"
        onClick={() => setDialogOpen(true)}
        className={className}
      >
        <Trash2Icon className="h-4 w-4 mr-2" />
        Delete
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this card?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this card?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
