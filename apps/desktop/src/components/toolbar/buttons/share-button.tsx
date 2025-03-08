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
import { type Session } from "@hypr/plugin-db";
import ShareAndPermissionPanel from "@/components/share-and-permission";

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
                  className="hover:bg-neutral-200"
                  aria-label="Share"
                >
                  <ShareIcon className="size-4" />
                </Button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent>
              <p>Share</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-80 p-0 overflow-clip focus:outline-none focus:ring-0 focus:ring-offset-0"
            align="end"
          >
            <ShareAndPermissionPanel
              session={session}
              email={email}
              setEmail={setEmail}
              currentUser={currentUser}
              participants={participants}
            />
          </PopoverContent>
        </Popover>
      )}
    </SessionAccessor>
  );
}
