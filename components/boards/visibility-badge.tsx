import { Badge } from "@/components/ui/badge";
import { Globe, Lock, Users } from "lucide-react";

interface VisibilityBadgeProps {
  visibility: string;
}

export function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  switch (visibility) {
    case "public":
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400"
        >
          <Globe className="h-3 w-3" />
          Public
        </Badge>
      );
    case "restricted":
      return (
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400"
        >
          <Users className="h-3 w-3" />
          Restricted
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Lock className="h-3 w-3" />
          Private
        </Badge>
      );
  }
}
