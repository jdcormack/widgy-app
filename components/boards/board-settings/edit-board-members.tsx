"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Crown, Edit, Users, UserPlus, UserMinus, Eye } from "lucide-react";
import { type OrganizationMember } from "@/app/actions";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getMemberDisplayName } from "@/components/cards/card-details";
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
import { Spinner } from "@/components/ui/spinner";

interface EditBoardMembersProps {
  boardId: Id<"boards">;
  boardVisibility: "public" | "private" | "restricted";
  members: OrganizationMember[];
}

function getAvailableRoles(
  boardVisibility: "public" | "private" | "restricted",
  canAssignOwner: boolean,
  isOwnerRole: boolean,
  isLastOwner: boolean,
  isCurrentUser: boolean
): Array<{
  value: "owner" | "editor" | "viewer";
  label: string;
  disabled: boolean;
}> {
  const availableRoles: Array<{
    value: "owner" | "editor" | "viewer";
    label: string;
    disabled: boolean;
  }> = [];

  if (boardVisibility === "restricted") {
    // For restricted boards, show applicable roles
    if (canAssignOwner) {
      // Owners can assign all roles
      availableRoles.push(
        {
          value: "owner",
          label: "Owner",
          disabled:
            (isOwnerRole && isLastOwner) || (isOwnerRole && isCurrentUser),
        },
        {
          value: "editor",
          label: "Editor",
          disabled: false,
        },
        {
          value: "viewer",
          label: "Viewer",
          disabled: false,
        }
      );
    } else {
      // Editors can only assign editor/viewer
      availableRoles.push(
        {
          value: "editor",
          label: "Editor",
          disabled: false,
        },
        {
          value: "viewer",
          label: "Viewer",
          disabled: false,
        }
      );
    }
  } else {
    // For non-restricted boards, only owner and editor (no viewer)
    if (canAssignOwner) {
      // Owners can assign owner/editor
      availableRoles.push(
        {
          value: "owner",
          label: "Owner",
          disabled:
            (isOwnerRole && isLastOwner) || (isOwnerRole && isCurrentUser),
        },
        {
          value: "editor",
          label: "Editor",
          disabled: false,
        }
      );
    } else {
      // Editors can only assign editor
      availableRoles.push({
        value: "editor",
        label: "Editor",
        disabled: false,
      });
    }
  }

  return availableRoles;
}

export function EditBoardMembers({
  boardId,
  boardVisibility,
  members,
}: EditBoardMembersProps) {
  const { user } = useUser();
  const [memberSelectorOpen, setMemberSelectorOpen] = useState(false);

  const canEdit = useQuery(api.boards.canEdit, { boardId });
  const isOwner = useQuery(api.boards.isOwner, { boardId });
  const boardMembers = useQuery(api.boards.getAllMembers, { boardId });

  const addViewer = useMutation(api.boards.addViewer);
  const addEditor = useMutation(api.boards.addEditor);
  const setMemberRole = useMutation(api.boards.setMemberRole);
  const removeMember = useMutation(api.boards.removeMember);

  const handleRoleChange = async (
    userId: string,
    newRole: "owner" | "editor" | "viewer"
  ) => {
    try {
      await setMemberRole({
        boardId,
        userId,
        newRole,
      });
    } catch (error) {
      console.error("Failed to change role:", error);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      // For restricted boards, add as viewer; for others, add as editor
      if (boardVisibility === "restricted") {
        await addViewer({ boardId, userId });
      } else {
        await addEditor({ boardId, userId });
      }
      setMemberSelectorOpen(false);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember({ boardId, userId });
    } catch (error) {
      console.error("Failed to remove member:", error);
    }
  };

  if (
    canEdit === undefined ||
    isOwner === undefined ||
    boardMembers === undefined
  ) {
    return null;
  }

  if (!canEdit) {
    return null;
  }

  const ownerCount = boardMembers.filter((m) => m.role === "owner").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Members
        </CardTitle>
        <CardDescription>
          Manage board members and their roles. Owners can assign any role.
          Editors can only assign editor or viewer roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {boardMembers.length} member{boardMembers.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Popover
            open={memberSelectorOpen}
            onOpenChange={setMemberSelectorOpen}
          >
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add member
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search members..." />
                <CommandList>
                  <CommandEmpty>No members found.</CommandEmpty>
                  <CommandGroup>
                    {members
                      .filter((m) => {
                        const isMember = boardMembers.some(
                          (bm) => bm.userId === m.userId
                        );
                        return !isMember;
                      })
                      .map((member) => (
                        <CommandItem
                          key={member.userId}
                          onSelect={() => handleAddMember(member.userId)}
                        >
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
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {boardMembers.length > 0 && (
          <div className="space-y-2">
            {boardMembers.map((memberData) => {
              const member = members.find(
                (m) => m.userId === memberData.userId
              );
              if (!member) return null;

              const isCurrentUser = memberData.userId === user?.id;
              const isOwnerRole = memberData.role === "owner";
              const isEditorRole = memberData.role === "editor";
              const isViewerRole = memberData.role === "viewer";
              const isLastOwner = isOwnerRole && ownerCount === 1;
              const canAssignOwner = isOwner === true;
              const canChangeRole = canEdit === true;

              const availableRoles = getAvailableRoles(
                boardVisibility,
                canAssignOwner,
                isOwnerRole,
                isLastOwner,
                isCurrentUser
              );

              return (
                <div
                  key={memberData.userId}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-8 w-8">
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
                    <div className="flex flex-col gap-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getMemberDisplayName(member)}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary">You</Badge>
                        )}
                        {isOwnerRole && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Owner
                          </Badge>
                        )}
                        {isEditorRole && !isOwnerRole && (
                          <Badge variant="secondary" className="gap-1">
                            <Edit className="h-3 w-3" />
                            Editor
                          </Badge>
                        )}
                        {isViewerRole && (
                          <Badge variant="secondary" className="gap-1">
                            <Eye className="h-3 w-3" />
                            Viewer
                          </Badge>
                        )}
                      </div>
                      {member.identifier && (
                        <span className="text-xs text-muted-foreground">
                          {member.identifier}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canChangeRole &&
                      // Editors cannot change owner roles
                      !(isOwnerRole && !canAssignOwner) && (
                        <Select
                          value={memberData.role}
                          onValueChange={(value) =>
                            handleRoleChange(
                              memberData.userId,
                              value as "owner" | "editor" | "viewer"
                            )
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem
                                key={role.value}
                                value={role.value}
                                disabled={role.disabled}
                              >
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    {canChangeRole && isOwnerRole && !canAssignOwner && (
                      <span className="text-xs text-muted-foreground">
                        Owner
                      </span>
                    )}
                    {/* Remove button - only for owners, can't remove self or last owner */}
                    {isOwner &&
                      !isCurrentUser &&
                      (!isOwnerRole || !isLastOwner) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(memberData.userId)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
