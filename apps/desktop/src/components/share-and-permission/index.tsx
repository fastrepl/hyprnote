import { useState } from "react";
import { InviteList } from "./invite-list";
import { ParticipantsSelector } from "./participants-selector";
import { GeneralAccessSelector } from "./general-access-selector";
import { Button } from "@hypr/ui/components/ui/button";
import { LinkIcon } from "lucide-react";

export * from "./invited-user";
export * from "./invite-list";
export * from "./participants-selector";
export * from "./general-access-selector";

interface ShareAndPermissionPanelProps {
  email: string;
  setEmail: (email: string) => void;
  currentUser: {
    name: string;
    email: string;
    avatarUrl: string;
  };
  participants: Array<{
    name: string;
    email: string;
    avatarUrl: string;
  }>;
}

export default function ShareAndPermissionPanel({
  email,
  setEmail,
  currentUser,
  participants,
}: ShareAndPermissionPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group],
    );
  };

  return (
    <div className="w-full dark:bg-neutral-700 dark:text-neutral-100">
      <div className="p-4">
        <div className="flex flex-col gap-2">
          <InviteList
            email={email}
            setEmail={setEmail}
            currentUser={currentUser}
          />

          <ParticipantsSelector
            expanded={expandedGroups.includes("participants")}
            onToggle={() => toggleGroup("participants")}
            participants={participants}
          />

          <div className="h-px bg-neutral-200"></div>

          <GeneralAccessSelector
            expanded={expandedGroups.includes("general")}
            onToggle={() => toggleGroup("general")}
          />

          <Button className="w-full dark:bg-white dark:text-black  dark:hover:bg-neutral-100 dark:hover:text-black">
            <LinkIcon className="size-4" /> Copy link
          </Button>
        </div>
      </div>
    </div>
  );
}
