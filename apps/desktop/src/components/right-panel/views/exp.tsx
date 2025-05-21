import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";

import { ParticipantsChipInner } from "@/components/editor-area/note-header/chips/participants-chip";
import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { SpeakerViewInnerProps } from "@hypr/tiptap/transcript";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { useState } from "react";

export const SpeakerSelector = ({
  onSpeakerIdChange,
  speakerId,
  speakerIndex,
  editorRef,
}: SpeakerViewInnerProps) => {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const sessionId = noteMatch?.params.id;
  const [isOpen, setIsOpen] = useState(false);

  const { data: participants } = useQuery({
    enabled: !!sessionId,
    queryKey: ["participants", sessionId!, "selector"],
    queryFn: () => dbCommands.sessionListParticipants(sessionId!),
  });

  const handleClickHuman = (human: Human) => {
    onSpeakerIdChange(human.id);
    setIsOpen(false);
  };

  const displayName = (participants ?? []).find((s) => s.id === speakerId)?.full_name ?? `Speaker ${speakerIndex}`;

  if (!sessionId) {
    return <p></p>;
  }

  return (
    <div className="mt-2">
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <span className="underline py-1 font-semibold">{displayName}</span>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom">
        <ParticipantsChipInner sessionId={sessionId} handleClickHuman={handleClickHuman} />
      </PopoverContent>
    </Popover>
    </div>
  );
};
