import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@hypr/ui/components/ui/tabs";

import { InviteList } from "./invite-list";
import { ParticipantsSelector } from "./participants-selector";
import { GeneralAccessSelector } from "./general-access-selector";
import { PublishTab } from "./publish-tab";
import { Button } from "@hypr/ui/components/ui/button";
import { LinkIcon } from "lucide-react";
import { cn } from "@/utils";

export * from "./invited-user";
export * from "./invite-list";
export * from "./participants-selector";
export * from "./general-access-selector";
export * from "./publish-tab";

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
    <Tabs
      defaultValue="share"
      className="w-full focus:outline-none focus:ring-0"
    >
      <TabsList className="w-full h-fit p-0 bg-transparent rounded-none focus:outline-none focus:ring-0">
        <TabsTrigger
          value="share"
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium border-b-2",
            "data-[state=active]:border-neutral-950 data-[state=inactive]:border-transparent",
            "rounded-none hover:bg-neutral-100 focus:outline-none focus:ring-0",
            "dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
          )}
        >
          Share
        </TabsTrigger>
        <TabsTrigger
          value="publish"
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium border-b-2",
            "data-[state=active]:border-neutral-950 data-[state=inactive]:border-transparent",
            "rounded-none hover:bg-neutral-100 focus:outline-none focus:ring-0",
            "dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-300",
          )}
        >
          Publish
        </TabsTrigger>
      </TabsList>

      <div className="p-4">
        <TabsContent
          value="share"
          className="mt-0 focus:outline-none focus:ring-0"
        >
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

            <Button>
              <LinkIcon className="size-4" /> Copy link
            </Button>
          </div>
        </TabsContent>
        <TabsContent
          value="publish"
          className="mt-0 focus:outline-none focus:ring-0"
        >
          <PublishTab />
        </TabsContent>
      </div>
    </Tabs>
  );
}
