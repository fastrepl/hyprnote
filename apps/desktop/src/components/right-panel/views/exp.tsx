import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";

import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { SpeakerViewInnerProps } from "@hypr/tiptap/transcript";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

export const SpeakerSelector = ({ onSpeakerIdChange, speakerId, speakerIndex }: SpeakerViewInnerProps) => {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const sessionId = noteMatch?.params.id;

  const { data: participants } = useQuery({
    enabled: !!sessionId,
    queryKey: ["participants", sessionId!, "selector"],
    queryFn: () => dbCommands.sessionListParticipants(sessionId!),
  });

  const displayName = (participants ?? []).find((s) => s.id === speakerId)?.full_name ?? undefined;

  if (!sessionId) {
    return <p>No session ID</p>;
  }

  return (
    <div style={{ width: "130px", padding: "8px" }}>
      <Select value={speakerId ?? undefined} onValueChange={onSpeakerIdChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Speaker ${speakerIndex}`}>{displayName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(participants ?? []).map((speaker: Human) => (
            <SelectItem key={speaker.id} value={speaker.id}>
              {speaker.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
