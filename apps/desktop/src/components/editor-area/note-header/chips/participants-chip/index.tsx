import { Users2Icon } from "lucide-react";
import { useMemo } from "react";

import { useHypr } from "@/contexts";
import { type Human } from "@hypr/plugin-db";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useLocalRowIds, useStore } from "tinybase/ui-react";
import { ParticipantsList } from "./participants-list";

interface ParticipantsChipProps {
  sessionId: string;
}

export function ParticipantsChip({ sessionId }: ParticipantsChipProps) {
  const { userId } = useHypr();
  const store = useStore();

  const participantRowIds = useLocalRowIds(
    "participantSession",
    sessionId,
  ) ?? [];

  const participants = useMemo(() => {
    return participantRowIds
      .map(rowId => {
        const mapping = store?.getRow("session_participants", rowId);
        if (!mapping) {
          return null;
        }

        const human = store?.getRow("humans", mapping.human_id.toString());
        if (!human) {
          return null;
        }

        return {
          id: human.id,
          full_name: human.full_name,
          is_user: human.is_user,
          organization_id: human.organization_id,
          email: human.email,
          job_title: human.job_title,
          linkedin_username: human.linkedin_username,
        } as Human;
      })
      .filter((human): human is Human => human !== null)
      .sort((a, b) => {
        if (a.is_user && !b.is_user) {
          return 1;
        }
        if (!a.is_user && b.is_user) {
          return -1;
        }
        return 0;
      });
  }, [participantRowIds, store]);

  const count = participants.length;
  const buttonText = useMemo(() => {
    const previewHuman = participants[0];
    if (!previewHuman) {
      return "Add participants";
    }

    if (previewHuman.id === userId && !previewHuman.full_name) {
      return "You";
    }

    return previewHuman.full_name ?? "??";
  }, [participants, userId]);

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
