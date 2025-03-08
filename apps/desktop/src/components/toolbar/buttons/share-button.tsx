import { ShareIcon } from "lucide-react";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import { useState } from "react";
import { commands as dbCommands } from "@hypr/plugin-db";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ShareAndPermissionPanel from "@/components/share-and-permission";

export function ShareButton() {
  const { id } = useParams({ from: "/app/note/$id" });
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const session = await dbCommands.getSession({ id });
      return session;
    },
  });

  const currentUser = {
    name: "John Jeong",
    email: "john@fastrepl.com",
    avatarUrl: "",
  };

  const participants = [
    currentUser,
    {
      name: "Alice Smith",
      email: "alice@fastrepl.com",
      avatarUrl: "",
    },
  ];

  if (!session) return null;

  return (
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
  );
}
