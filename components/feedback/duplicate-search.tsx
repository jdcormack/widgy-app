"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb, Search, Check } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface DuplicateSearchProps {
  onSelect: (feedbackId: Id<"feedback">) => void;
  excludeId?: Id<"feedback">;
}

export function DuplicateSearch({ onSelect, excludeId }: DuplicateSearchProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const results = useQuery(
    api.feedback.searchDuplicates,
    debouncedQuery.length > 0 ? { query: debouncedQuery } : "skip"
  );

  const filteredResults = results?.filter((f) => f._id !== excludeId) ?? [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for existing feedback..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {debouncedQuery.length > 0 && filteredResults.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No matching feedback found
        </p>
      )}

      {filteredResults.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {filteredResults.map((feedback) => (
            <Card
              key={feedback._id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onSelect(feedback._id)}
            >
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {feedback.category === "bug" ? (
                    <Bug className="h-4 w-4 text-red-500 shrink-0" />
                  ) : (
                    <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">
                      {feedback.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {feedback.description}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Check className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
