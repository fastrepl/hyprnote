import { type Editor as TiptapEditor } from "@tiptap/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, useState } from "react";

import type { Human } from "@hypr/plugin-db";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return ({ node, updateAttributes, editor }: NodeViewProps) => {
    const [speakerId, setSpeakerId] = useState<string | undefined>(node.attrs?.["speaker-id"] ?? undefined);
    const speakerIndex = node.attrs?.["speaker-index"] ?? undefined;
    const speakerLabel = node.attrs?.["speaker-label"] ?? undefined;

    const onSpeakerChange = (speaker: Human) => {
      setSpeakerId(speaker.id);
      updateAttributes({ "speaker-id": speaker.id });
      updateAttributes({ "speaker-label": speaker.full_name });
    };

    return (
      <NodeViewWrapper>
        <Comp
          speakerId={speakerId}
          speakerIndex={speakerIndex}
          speakerLabel={speakerLabel}
          onSpeakerChange={onSpeakerChange}
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
  onSpeakerChange: (speaker: Human) => void;
  editorRef?: TiptapEditor;
};

export type SpeakerViewInnerComponent = (props: SpeakerViewInnerProps) => JSX.Element;
