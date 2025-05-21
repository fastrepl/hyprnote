import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";

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
        <div className="flex flex-col gap-2">
          {(participants ?? []).map((speaker: Human) => (
            <button
              key={speaker.id}
              className="w-full text-left"
              onClick={() => onSpeakerIdChange(speaker.id)}
            >
              {speaker.full_name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
