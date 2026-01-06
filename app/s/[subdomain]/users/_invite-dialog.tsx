"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { OrganizationCustomRoleKey } from "@clerk/types";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function InviteDialog({ open, onOpenChange, onSuccess }: InviteDialogProps) {
  const { organization } = useOrganization();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrganizationCustomRoleKey>("org:member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<OrganizationCustomRoleKey[]>([]);
  const isPopulated = useRef(false);

  // Fetch available roles when dialog opens
  useEffect(() => {
    if (!open || !organization || isPopulated.current) return;

    organization
      .getRoles({ pageSize: 20, initialPage: 1 })
      .then((res) => {
        isPopulated.current = true;
        setAvailableRoles(res.data.map((r) => r.key as OrganizationCustomRoleKey));
      })
      .catch((err) => {
        console.error("Failed to fetch roles:", err);
        // Fallback to default roles
        setAvailableRoles(["org:admin", "org:member"]);
      });
  }, [open, organization]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("org:member");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await organization.inviteMember({
        emailAddress: email.trim(),
        role,
      });
      toast.success(`Invitation sent to ${email}`);
      onSuccess();
    } catch (error) {
      console.error("Failed to send invitation:", error);
      if (error instanceof Error) {
        // Handle specific Clerk errors
        if (error.message.includes("already a member")) {
          toast.error("This user is already a member of the organization");
        } else if (error.message.includes("already invited")) {
          toast.error("An invitation has already been sent to this email");
        } else {
          toast.error(error.message || "Failed to send invitation");
        }
      } else {
        toast.error("Failed to send invitation");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleLabel = (roleKey: string): string => {
    if (roleKey === "org:admin") return "Admin";
    if (roleKey === "org:member") return "Member";
    // Handle custom roles
    return roleKey.replace("org:", "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as OrganizationCustomRoleKey)}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.length > 0 ? (
                    availableRoles.map((roleKey) => (
                      <SelectItem key={roleKey} value={roleKey}>
                        {getRoleLabel(roleKey)}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="org:admin">Admin</SelectItem>
                      <SelectItem value="org:member">Member</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === "org:admin"
                  ? "Admins can manage members and organization settings."
                  : "Members can access the organization but cannot manage settings."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" />
                  Sending...
                </>
              ) : (
                "Send invitation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

