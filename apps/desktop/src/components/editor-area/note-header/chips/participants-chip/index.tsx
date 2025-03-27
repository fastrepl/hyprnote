import { useQuery } from "@tanstack/react-query";
import { Users2Icon } from "lucide-react";

import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { ParticipantsList } from "./participants-list";

interface ParticipantsChipProps {
  sessionId: string;
}

export function ParticipantsChip({ sessionId }: ParticipantsChipProps) {
  const participants = useQuery({
    queryKey: ["participants", sessionId],
    queryFn: () => dbCommands.sessionListParticipants(sessionId),
  });

  const previewHuman = ((participants.data ?? []).sort((a, b) => {
    if (a.is_user && !b.is_user) return 1;
    if (!a.is_user && b.is_user) return -1;
    return 0;
  })).at(0);

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs">
          <Users2Icon size={14} />
          {previewHuman?.full_name ?? ""}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="shadow-lg"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ParticipantsList
          sessionId={sessionId}
        />
      </PopoverContent>
    </Popover>
  );
}
