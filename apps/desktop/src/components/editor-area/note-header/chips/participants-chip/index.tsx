import { useQuery } from "@tanstack/react-query";
import { Users2Icon } from "lucide-react";
import { useMemo } from "react";

import { useHypr } from "@/contexts";
import { commands as dbCommands } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { ParticipantsList } from "./participants-list";

interface ParticipantsChipProps {
  sessionId: string;
}

export function ParticipantsChip({ sessionId }: ParticipantsChipProps) {
  const { userId } = useHypr();

  const participants = useQuery({
    queryKey: ["participants", sessionId],
    queryFn: async () => {
      const participants = await dbCommands.sessionListParticipants(sessionId);
      return participants.sort((a, b) => {
        if (a.is_user && !b.is_user) {
          return 1;
        }
        if (!a.is_user && b.is_user) {
          return -1;
        }
        return 0;
      });
    },
  });

  const count = participants.data?.length ?? 0;
  const buttonText = useMemo(() => {
    const previewHuman = participants.data?.at(0);
    if (!previewHuman) {
      return "Add participants";
    }

    if (previewHuman.id === userId && !previewHuman.full_name) {
      return "You";
    }

    return previewHuman.full_name ?? "??";
  }, [participants.data]);

  return (
    <Popover>
      <PopoverTrigger>
        <div className="flex flex-row items-center gap-1 rounded-md px-2 py-1.5 hover:bg-neutral-100 text-xs">
          <Users2Icon size={14} />
          <span>{buttonText}</span>
          {count > 1 && <span className="text-neutral-400">+ {count - 1}</span>}
        </div>
      </PopoverTrigger>

      <PopoverContent className="shadow-lg w-80" align="start">
        <ParticipantsList sessionId={sessionId} />
      </PopoverContent>
    </Popover>
  );
}
