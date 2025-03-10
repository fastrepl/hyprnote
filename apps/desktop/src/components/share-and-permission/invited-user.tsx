import { Avatar, AvatarImage } from "@hypr/ui/components/ui/avatar";
import { Button } from "@hypr/ui/components/ui/button";
import { X } from "lucide-react";

export interface InvitedUserProps {
  name: string;
  email: string;
  avatarUrl: string;
  onRemove: () => void;
}

export const InvitedUser = ({
  name,
  email,
  avatarUrl,
  onRemove,
}: InvitedUserProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Avatar className="h-8 w-8 bg-neutral-100 dark:bg-neutral-900">
        <AvatarImage src={avatarUrl} alt={`${name}'s avatar`} />
      </Avatar>
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-neutral-600 dark:text-neutral-100">
          {email}
        </div>
      </div>
    </div>
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-neutral-100 dark:hover:bg-neutral-900"
      onClick={onRemove}
    >
      <X className="size-4 text-neutral-600 dark:text-neutral-100" />
    </Button>
  </div>
);
