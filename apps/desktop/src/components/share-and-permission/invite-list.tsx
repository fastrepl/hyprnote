import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { Trans, useLingui } from "@lingui/react/macro";
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
}: InviteListProps) => {
  const { t } = useLingui();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder={t`Email separated by commas`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-sm focus:outline-none focus:ring-0 focus:ring-offset-0"
          autoFocus={false}
        />
        <Button variant="outline">
          <Trans>Invite</Trans>
        </Button>
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
};
