"use client";

import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Users,
  UserPlus,
  UserMinus,
  Mail,
  Crown,
  Shield,
  Clock,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { InviteDialog } from "./_invite-dialog";

const OrgParams = {
  memberships: {
    pageSize: 50,
    keepPreviousData: true,
  },
  invitations: {
    pageSize: 50,
    keepPreviousData: true,
  },
};

function getMemberDisplayName(member: {
  firstName?: string | null;
  lastName?: string | null;
  identifier?: string | null;
}): string {
  if (member.firstName || member.lastName) {
    return [member.firstName, member.lastName].filter(Boolean).join(" ");
  }
  return member.identifier || "Unknown";
}

function getRoleLabel(role: string): string {
  if (role === "org:admin") return "Admin";
  if (role === "org:member") return "Member";
  // Handle custom roles - remove "org:" prefix and capitalize
  return role.replace("org:", "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getRoleIcon(role: string) {
  if (role === "org:admin") return <Crown className="h-3 w-3" />;
  if (role === "org:member") return <Shield className="h-3 w-3" />;
  return <Shield className="h-3 w-3" />;
}

export function UsersClient() {
  const { user } = useUser();
  const { isLoaded, organization, membership, memberships, invitations } =
    useOrganization(OrgParams);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [revokingInvitation, setRevokingInvitation] = useState<string | null>(null);

  const isAdmin = membership?.role === "org:admin";

  const handleRoleChange = async (membershipId: string, newRole: string) => {
    const membershipItem = memberships?.data?.find((m) => m.id === membershipId);
    if (!membershipItem) return;

    setUpdatingRole(membershipId);
    try {
      await membershipItem.update({ role: newRole });
      await memberships?.revalidate?.();
      toast.success("Role updated successfully");
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (membershipId: string) => {
    const membershipItem = memberships?.data?.find((m) => m.id === membershipId);
    if (!membershipItem) return;

    setRemovingMember(membershipId);
    try {
      await membershipItem.destroy();
      await memberships?.revalidate?.();
      toast.success("Member removed successfully");
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const invitationItem = invitations?.data?.find((i) => i.id === invitationId);
    if (!invitationItem) return;

    setRevokingInvitation(invitationId);
    try {
      await invitationItem.revoke();
      await invitations?.revalidate?.();
      toast.success("Invitation revoked");
    } catch (error) {
      console.error("Failed to revoke invitation:", error);
      toast.error("Failed to revoke invitation");
    } finally {
      setRevokingInvitation(null);
    }
  };

  const handleInviteSuccess = async () => {
    await invitations?.revalidate?.();
    setInviteDialogOpen(false);
  };

  // Loading state
  if (!isLoaded || !organization) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingInvitations = invitations?.data?.filter(
    (inv) => inv.status === "pending"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black mt-2">Team Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage members of {organization.name}
        </p>
      </div>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>
            View and manage organization members and their roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {memberships?.data?.length ?? 0} member
                {(memberships?.data?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite member
              </Button>
            )}
          </div>

          {memberships?.data && memberships.data.length > 0 && (
            <div className="space-y-2">
              {memberships.data.map((membershipItem) => {
                const publicUserData = membershipItem.publicUserData;
                const isCurrentUser = publicUserData?.userId === user?.id;
                const isOwnerRole = membershipItem.role === "org:admin";
                const adminCount =
                  memberships.data?.filter((m) => m.role === "org:admin").length ?? 0;
                const isLastAdmin = isOwnerRole && adminCount === 1;

                return (
                  <div
                    key={membershipItem.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={publicUserData?.imageUrl ?? undefined} />
                        <AvatarFallback>
                          {getMemberDisplayName({
                            firstName: publicUserData?.firstName,
                            lastName: publicUserData?.lastName,
                            identifier: publicUserData?.identifier,
                          })
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
                            {getMemberDisplayName({
                              firstName: publicUserData?.firstName,
                              lastName: publicUserData?.lastName,
                              identifier: publicUserData?.identifier,
                            })}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary">You</Badge>
                          )}
                          <Badge variant="secondary" className="gap-1">
                            {getRoleIcon(membershipItem.role)}
                            {getRoleLabel(membershipItem.role)}
                          </Badge>
                        </div>
                        {publicUserData?.identifier && (
                          <span className="text-xs text-muted-foreground">
                            {publicUserData.identifier}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && !isCurrentUser && (
                        <>
                          <Select
                            value={membershipItem.role}
                            onValueChange={(value) =>
                              handleRoleChange(membershipItem.id, value)
                            }
                            disabled={
                              updatingRole === membershipItem.id ||
                              (isLastAdmin && isOwnerRole)
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              {updatingRole === membershipItem.id ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="org:admin"
                                disabled={isLastAdmin && isOwnerRole}
                              >
                                Admin
                              </SelectItem>
                              <SelectItem value="org:member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveMember(membershipItem.id)}
                            disabled={
                              removingMember === membershipItem.id ||
                              (isLastAdmin && isOwnerRole)
                            }
                          >
                            {removingMember === membershipItem.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination controls */}
          {memberships && (memberships.hasPreviousPage || memberships.hasNextPage) && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!memberships.hasPreviousPage || memberships.isFetching}
                onClick={() => memberships.fetchPrevious?.()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!memberships.hasNextPage || memberships.isFetching}
                onClick={() => memberships.fetchNext?.()}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations Card */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations that have been sent but not yet accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingInvitations && pendingInvitations.length > 0 ? (
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {invitation.emailAddress
                            .split("@")[0]
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {invitation.emailAddress}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Sent {invitation.createdAt.toLocaleDateString()}
                          <Badge variant="secondary" className="gap-1 text-xs">
                            {getRoleIcon(invitation.role)}
                            {getRoleLabel(invitation.role)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      disabled={revokingInvitation === invitation.id}
                    >
                      {revokingInvitation === invitation.id ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No pending invitations.
              </p>
            )}

            {/* Pagination controls for invitations */}
            {invitations &&
              (invitations.hasPreviousPage || invitations.hasNextPage) && (
                <div className="flex justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      !invitations.hasPreviousPage || invitations.isFetching
                    }
                    onClick={() => invitations.fetchPrevious?.()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!invitations.hasNextPage || invitations.isFetching}
                    onClick={() => invitations.fetchNext?.()}
                  >
                    Next
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <InviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleInviteSuccess}
      />
    </div>
  );
}

