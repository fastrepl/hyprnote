import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { InvitedUser } from "./invited-user";

export interface InviteListProps {
  email: string;
  setEmail: (email: string) => void;
  currentUser: { name: string; email: string; avatarUrl: string };
}

export const InviteList = ({
  email,
  setEmail,
  currentUser,
}: InviteListProps) => (
  <div className="flex flex-col gap-4">
    <div className="flex gap-2">
      <Input
        placeholder="Email separated by commas"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="text-sm focus:outline-none focus:ring-0 focus:ring-offset-0"
        autoFocus={false}
      />
      <Button variant="outline">Invite</Button>
    </div>
    <div className="space-y-3">
      <InvitedUser
        name={`${currentUser.name} (You)`}
        email={currentUser.email}
        avatarUrl={currentUser.avatarUrl}
        onRemove={() => {}}
      />
    </div>
  </div>
);
