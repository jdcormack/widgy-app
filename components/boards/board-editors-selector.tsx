"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, Edit, X } from "lucide-react";
import { type OrganizationMember } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMemberDisplayName } from "@/components/cards/card-details";

interface BoardEditorsSelectorProps {
  members: OrganizationMember[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  excludeUserIds?: string[]; // Users to exclude from selection (e.g., owners)
  disabled?: boolean;
}

export function BoardEditorsSelector({
  members,
  selectedUserIds,
  onChange,
  excludeUserIds = [],
  disabled = false,
}: BoardEditorsSelectorProps) {
  const [open, setOpen] = useState(false);

  const availableMembers = members.filter(
    (m) => !excludeUserIds.includes(m.userId)
  );

  const selectedMembers = availableMembers.filter((m) =>
    selectedUserIds.includes(m.userId)
  );

  const toggleMember = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const selectAll = () => {
    const allIds = availableMembers.map((m) => m.userId);
    onChange(allIds);
  };

  const deselectAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
          >
            <Edit className="mr-2 h-4 w-4" />
            {selectedMembers.length > 0
              ? `${selectedMembers.length} editor${
                  selectedMembers.length !== 1 ? "s" : ""
                } selected`
              : "Select editors"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search members..." />
            <CommandList>
              <CommandEmpty>No members found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    if (selectedUserIds.length === availableMembers.length) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserIds.length === availableMembers.length
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {selectedUserIds.length === availableMembers.length
                    ? "Deselect all"
                    : "Select all"}
                </CommandItem>
                {availableMembers.map((member) => {
                  const isSelected = selectedUserIds.includes(member.userId);
                  return (
                    <CommandItem
                      key={member.userId}
                      onSelect={() => toggleMember(member.userId)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <Avatar className="mr-2 h-6 w-6">
                        <AvatarImage src={member.imageUrl ?? undefined} />
                        <AvatarFallback>
                          {getMemberDisplayName(member)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      {getMemberDisplayName(member)}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((member) => (
            <Badge key={member.userId} variant="secondary" className="gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={member.imageUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getMemberDisplayName(member)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              {getMemberDisplayName(member)}
              <button
                onClick={() => toggleMember(member.userId)}
                className="ml-1 rounded-full hover:bg-muted"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

