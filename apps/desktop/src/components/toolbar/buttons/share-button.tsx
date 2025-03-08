import { ShareIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import { useLocation } from "@tanstack/react-router";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@hypr/ui/components/ui/tabs";
import { type Session } from "@hypr/plugin-db";
import {
  InviteList,
  ParticipantsSelector,
  GeneralAccessSelector,
  PublishTab,
} from "@/components/share-and-permission";

const SessionAccessor = ({
  children,
}: {
  children: (sessionData: Session | null) => React.ReactNode;
}) => {
  try {
    const { useSession } = require("@/contexts");
    const session = useSession((s: { session: Session }) => s.session);
    return <>{children(session)}</>;
  } catch (e) {
    return <>{children(null)}</>;
  }
};

export function ShareButton() {
  const { pathname } = useLocation();
  const inNote = pathname.includes("/app/note/");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  if (!inNote) return null;

  const currentUser = {
    name: "John Jeong",
    email: "john@fastrepl.com",
    avatarUrl: "/avatar.png",
  };

  const participants = [
    currentUser,
    {
      name: "Alice Smith",
      email: "alice@fastrepl.com",
      avatarUrl: "/avatar.png",
    },
  ];

  return (
    <SessionAccessor>
      {(session) => (
        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-neutral-100 rounded"
                  aria-label="Share"
                >
                  <ShareIcon className="size-4 text-neutral-600" />
                </Button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent>
              <p>Share</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-0 overflow-clip" align="end">
            <Tabs defaultValue="share" className="w-full">
              <TabsList className="w-full h-fit p-0 bg-transparent rounded-none">
                <TabsTrigger
                  value="share"
                  className="flex-1 px-4 py-3 text-sm font-medium border-b-2 data-[state=active]:border-neutral-950 data-[state=inactive]:border-transparent rounded-none hover:bg-neutral-100"
                >
                  Share
                </TabsTrigger>
                <TabsTrigger
                  value="publish"
                  className="flex-1 px-4 py-3 text-sm font-medium border-b-2 data-[state=active]:border-neutral-950 data-[state=inactive]:border-transparent rounded-none hover:bg-neutral-100"
                >
                  Publish
                </TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="share" className="mt-0">
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
                <TabsContent value="publish" className="mt-0">
                  <PublishTab session={session} />
                </TabsContent>
              </div>
            </Tabs>
          </PopoverContent>
        </Popover>
      )}
    </SessionAccessor>
  );
}
