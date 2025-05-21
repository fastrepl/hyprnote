import { type Editor as TiptapEditor } from "@tiptap/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, useState } from "react";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return ({ node, updateAttributes, editor }: NodeViewProps) => {
    const [speakerId, setSpeakerId] = useState<string | undefined>(node.attrs?.["speaker-id"] ?? undefined);
    const speakerIndex = node.attrs?.["speaker-index"] ?? undefined;
    const speakerLabel = node.attrs?.["speaker-label"] ?? undefined;

    const onSpeakerIdChange = (speakerId: string) => {
      setSpeakerId(speakerId);
      updateAttributes({ "speaker-id": speakerId });
    };

    return (
      <NodeViewWrapper>
        <Comp
          speakerId={speakerId}
          speakerIndex={speakerIndex}
          speakerLabel={speakerLabel}
          onSpeakerIdChange={onSpeakerIdChange}
          editorRef={editor}
        />
        <NodeViewContent />
      </NodeViewWrapper>
    );
  };
};

export type SpeakerViewInnerProps = {
  speakerId: string | undefined;
  speakerIndex: number | undefined;
  speakerLabel: string | undefined;
  onSpeakerIdChange: (speakerId: string) => void;
  editorRef?: TiptapEditor;
};

export type SpeakerViewInnerComponent = (props: SpeakerViewInnerProps) => JSX.Element;
