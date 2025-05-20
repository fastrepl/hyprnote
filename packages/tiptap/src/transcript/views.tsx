import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, useState } from "react";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return ({ node, updateAttributes }: NodeViewProps) => {
    const [speakerId, setSpeakerId] = useState<string | undefined>(node.attrs?.speakerId ?? undefined);
    const speakerIndex = node.attrs?.speakerIndex ?? undefined;

    const onSpeakerIdChange = (speakerId: string) => {
      setSpeakerId(speakerId);
      updateAttributes({ speakerId });
    };

    return (
      <NodeViewWrapper>
        <Comp
          speakerId={speakerId}
          speakerIndex={speakerIndex}
          onSpeakerIdChange={onSpeakerIdChange}
        />
        <NodeViewContent />
      </NodeViewWrapper>
    );
  };
};

export type SpeakerViewInnerProps = {
  speakerId: string | undefined;
  speakerIndex: number | undefined;
  onSpeakerIdChange: (speakerId: string) => void;
};

export type SpeakerViewInnerComponent = (props: SpeakerViewInnerProps) => JSX.Element;
