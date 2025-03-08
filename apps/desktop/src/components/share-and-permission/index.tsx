import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@hypr/ui/components/ui/tabs";
import { type Session } from "@hypr/plugin-db";

import { InviteList } from "./invite-list";
import { ParticipantsSelector } from "./participants-selector";
import { GeneralAccessSelector } from "./general-access-selector";
import { PublishTab } from "./publish-tab";

export * from "./invited-user";
export * from "./invite-list";
export * from "./participants-selector";
export * from "./general-access-selector";
export * from "./publish-tab";

interface ShareAndPermissionPanelProps {
  session: Session | null;
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
  session,
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
    <Tabs defaultValue="share" className="w-full focus:outline-none focus:ring-0">
      <TabsList className="w-full h-fit p-0 bg-transparent rounded-none focus:outline-none focus:ring-0">
        <TabsTrigger
          value="share"
          className="flex-1 px-4 py-3 text-sm font-medium border-b-2 data-[state=active]:border-neutral-950 data-[state=inactive]:border-transparent rounded-none hover:bg-neutral-100 focus:outline-none focus:ring-0"
        >
          Share
        </TabsTrigger>
        <TabsTrigger
          value="publish"
          className="flex-1 px-4 py-3 text-sm font-medium border-b-2 data-[state=active]:border-neutral-950 data-[state=inactive]:border-transparent rounded-none hover:bg-neutral-100 focus:outline-none focus:ring-0"
        >
          Publish
        </TabsTrigger>
      </TabsList>

      <div className="p-4">
        <TabsContent value="share" className="mt-0 focus:outline-none focus:ring-0">
          <div className="flex flex-col gap-4">
            <InviteList
              email={email}
              setEmail={setEmail}
              currentUser={currentUser}
            />

            <div className="space-y-3">
              <ParticipantsSelector
                expanded={expandedGroups.includes("participants")}
                onToggle={() => toggleGroup("participants")}
                participants={participants}
              />

              <GeneralAccessSelector
                expanded={expandedGroups.includes("general")}
                onToggle={() => toggleGroup("general")}
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="publish" className="mt-0 focus:outline-none focus:ring-0">
          <PublishTab session={session} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
