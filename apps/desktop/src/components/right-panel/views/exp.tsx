import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";

import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { SpeakerViewInnerProps } from "@hypr/tiptap/transcript";

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
    return <p></p>;
  }

  return (
    <div style={{ width: "170px", padding: "8px" }}>
      <select 
        value={speakerId ?? ""}
        onChange={(e) => onSpeakerIdChange(e.target.value)}
        style={{ width: "100%", padding: "8px" }}
      >
        <option value="" disabled>
          {displayName || `Speaker ${speakerIndex}`}
        </option>
        {(participants ?? []).map((speaker: Human) => (
          <option key={speaker.id} value={speaker.id}>
            {speaker.full_name}
          </option>
        ))}
      </select>
    </div>
  );
};
