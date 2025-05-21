import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";

import { ParticipantsChipInner } from "@/components/editor-area/note-header/chips/participants-chip";
import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { SpeakerViewInnerProps } from "@hypr/tiptap/transcript";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";

export const SpeakerSelector = ({
  onSpeakerIdChange,
  speakerId,
  speakerIndex,
  editorRef,
}: SpeakerViewInnerProps) => {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const sessionId = noteMatch?.params.id;

  const { data: participants } = useQuery({
    enabled: !!sessionId,
    queryKey: ["participants", sessionId!, "selector"],
    queryFn: () => dbCommands.sessionListParticipants(sessionId!),
  });

  const handleClickHuman = (human: Human) => {
    onSpeakerIdChange(human.id);
  };

  const displayName = (participants ?? []).find((s) => s.id === speakerId)?.full_name ?? `Speaker ${speakerIndex}`;

  if (!sessionId) {
    return <p></p>;
  }

  return (
    <Popover>
      <PopoverTrigger>
        <span className="underline p-1">{displayName}</span>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom">
        <ParticipantsChipInner sessionId={sessionId} handleClickHuman={handleClickHuman} />
      </PopoverContent>
    </Popover>
  );
};
