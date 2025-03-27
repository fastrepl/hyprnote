import { useQuery } from "@tanstack/react-query";
import { Users2Icon } from "lucide-react";

import { useHypr } from "@/contexts";
import { commands as dbCommands, type Human } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { ParticipantsList } from "./participants-list";

interface ParticipantsChipProps {
  sessionId: string;
}

export function ParticipantsChip({ sessionId }: ParticipantsChipProps) {
  const { userId } = useHypr();

  const participants = useQuery({
    queryKey: ["participants", sessionId],
    queryFn: () => dbCommands.sessionListParticipants(sessionId),
  });

  const theUser = useQuery({
    queryKey: ["human", userId],
    queryFn: async () => {
      const human = await dbCommands.getHuman(userId) as Human;
      return human;
    },
  });

  const previewHuman = (participants.data && participants.data.length > 0) ? participants.data[0] : theUser.data!;

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
