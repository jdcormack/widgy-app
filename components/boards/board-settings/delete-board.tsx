"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trash2 } from "lucide-react";

interface DeleteBoardProps {
  boardId: Id<"boards">;
  boardName: string;
}

export function DeleteBoard({ boardId, boardName }: DeleteBoardProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = useQuery(api.boards.isOwner, { boardId });
  const deleteBoard = useMutation(api.boards.remove);

  const handleDelete = async () => {
    if (confirmationText !== boardName) return;

    setIsDeleting(true);
    try {
      await deleteBoard({ boardId });
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

  // Don't render anything if not owner or still loading
  if (isOwner === undefined || !isOwner) {
    return null;
  }

  return (
    <>
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
                  This action cannot be undone. This will permanently delete the
                  board <strong>{boardName}</strong>.
                </p>
                <p className="text-destructive font-medium">
                  All cards in this board will also be permanently deleted.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please type <strong>{boardName}</strong> to confirm.
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
              disabled={confirmationText !== boardName || isDeleting}
            >
              {isDeleting ? <Spinner /> : "Delete board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
