"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Columns3, IdCard, FileText, Columns3Icon } from "lucide-react";

import { api } from "@/convex/_generated/api";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();

  // Search cards when there's a search query
  const searchResults = useQuery(
    api.cards.search,
    search.trim().length > 0 ? { query: search } : "skip"
  );

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span>Search…</span>
        <Kbd>Ctrl+K</Kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command or search…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Show search results when there's a search query */}
          {search.trim().length > 0 &&
            searchResults &&
            searchResults.length > 0 && (
              <CommandGroup heading="Cards">
                {searchResults.map((card) => (
                  <CommandItem
                    key={card._id}
                    value={`card-${card._id}-${card.title}-${card.description}`}
                    onSelect={() =>
                      runCommand(() => router.push(`/cards/${card._id}`))
                    }
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium capitalize">
                          {card.title || "Untitled Card"}
                        </span>
                        {card.boardName ? (
                          <Badge className="gap-1 shrink-0">
                            <Columns3Icon className="text-white" />
                            {card.boardName}
                          </Badge>
                        ) : null}
                      </div>
                      {card.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {card.description.slice(0, 60)}
                          {card.description.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/boards"))}
            >
              <Columns3 />
              <span>Boards</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/cards"))}
            >
              <IdCard />
              <span>Cards</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
