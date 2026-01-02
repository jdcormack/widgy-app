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
import { Check, Crown, X } from "lucide-react";
import { type OrganizationMember } from "@/app/actions";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMemberDisplayName } from "@/components/cards/card-details";

interface BoardOwnersSelectorProps {
  members: OrganizationMember[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
}

export function BoardOwnersSelector({
  members,
  selectedUserIds,
  onChange,
  disabled = false,
}: BoardOwnersSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedMembers = members.filter((m) =>
    selectedUserIds.includes(m.userId)
  );

  const toggleMember = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      // Don't allow removing if it's the last one
      if (selectedUserIds.length <= 1) {
        return;
      }
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const selectAll = () => {
    const allIds = members.map((m) => m.userId);
    onChange(allIds);
  };

  const deselectAll = () => {
    // Must maintain at least 1 owner
    if (selectedUserIds.length > 1) {
      onChange([selectedUserIds[0]]);
    }
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
            <Crown className="mr-2 h-4 w-4" />
            {selectedMembers.length > 0
              ? `${selectedMembers.length} owner${
                  selectedMembers.length !== 1 ? "s" : ""
                }`
              : "Select owners"}
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
                    if (selectedUserIds.length === members.length) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserIds.length === members.length
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {selectedUserIds.length === members.length
                    ? "Deselect all"
                    : "Select all"}
                </CommandItem>
                {members.map((member) => {
                  const isSelected = selectedUserIds.includes(member.userId);
                  const isLast = selectedUserIds.length === 1 && isSelected;
                  return (
                    <CommandItem
                      key={member.userId}
                      onSelect={() => {
                        if (!isLast) {
                          toggleMember(member.userId);
                        }
                      }}
                      disabled={isLast}
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
          {selectedMembers.map((member) => {
            const isLast = selectedUserIds.length === 1 && selectedUserIds[0] === member.userId;
            return (
              <Badge key={member.userId} variant="secondary" className="gap-1 py-1.5 px-2">
                <Crown className="h-3 w-3" />
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
                <div className="flex flex-col gap-0">
                  <span className="text-xs font-medium leading-tight">{getMemberDisplayName(member)}</span>
                  {member.identifier && (
                    <span className="text-[10px] text-muted-foreground leading-tight">{member.identifier}</span>
                  )}
                </div>
                {!isLast && (
                  <button
                    onClick={() => toggleMember(member.userId)}
                    className="ml-1 rounded-full hover:bg-muted"
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

