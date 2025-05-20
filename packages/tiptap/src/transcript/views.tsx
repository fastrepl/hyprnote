import { useQuery } from "@tanstack/react-query";
import { useMatch } from "@tanstack/react-router";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";

import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

export const SpeakerView = ({ node, updateAttributes }: NodeViewProps) => {
  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const sessionId = noteMatch?.params.id;

  const { data: participants } = useQuery({
    enabled: !!sessionId,
    queryKey: ["participants", sessionId!],
    queryFn: () => dbCommands.sessionListParticipants(sessionId!),
  });

  const speakerId = node.attrs?.speakerId;
  const speakerIndex = node.attrs?.speakerIndex;

  const displayName = (participants ?? []).find((s) => s.id === speakerId)?.full_name ?? undefined;

  const handleChange = (speakerId: string) => {
    updateAttributes({ speakerId });
  };

  if (!sessionId) {
    return (
      <NodeViewWrapper>
        <p>No session ID</p>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div style={{ width: "130px", padding: "8px" }}>
        <Select value={speakerId} onValueChange={handleChange}>
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

      <div style={{ padding: "8px" }}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};
