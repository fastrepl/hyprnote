import { useQuery } from "@tanstack/react-query";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";

import { commands as dbCommands, Human } from "@hypr/plugin-db";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@hypr/ui/components/ui/select";

export const SpeakerView = ({ node, updateAttributes }: NodeViewProps) => {
  const { data: participants } = useQuery({
    queryKey: ["participants", "22393beb-8acf-4577-b210-7211e1700d66"],
    queryFn: () => dbCommands.sessionListParticipants("22393beb-8acf-4577-b210-7211e1700d66"),
  });

  const { speakerId } = node.attrs as { speakerId: string };

  const displayName = (participants ?? []).find((s) => s.id === speakerId)?.full_name ?? "NOT FOUND";

  const handleChange = (speakerId: string) => {
    updateAttributes({ speakerId });
  };

  return (
    <NodeViewWrapper className="transcript-speaker">
      <div style={{ width: "130px", padding: "8px" }}>
        <Select value={speakerId} onValueChange={handleChange}>
          <SelectTrigger className="transcript-speaker-select" data-speaker-id={speakerId}>
            <SelectValue placeholder="Select speaker">{displayName}</SelectValue>
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
