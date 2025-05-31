import { type Editor as TiptapEditor } from "@tiptap/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, memo, useCallback } from "react";

import type { Human } from "@hypr/plugin-db";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return memo(({ node, editor, updateAttributes }: NodeViewProps) => {
    const speakerId = node.attrs?.["speaker-id"] ?? undefined;
    const speakerIndex = node.attrs?.["speaker-index"] ?? undefined;
    const speakerLabel = node.attrs?.["speaker-label"] ?? undefined;

    const onSpeakerChange = useCallback((speaker: Human, range: SpeakerChangeRange) => {
      if (range === "current") {
        updateAttributes({ "speaker-id": speaker.id });
        updateAttributes({ "speaker-label": speaker.full_name });
      }
    }, [updateAttributes]);

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
  }, (prevProps, nextProps) => {
    return true;
  });
};

export type SpeakerViewInnerProps = {
  speakerId: string | undefined;
  speakerIndex: number | undefined;
  speakerLabel: string | undefined;
  onSpeakerChange: (speaker: Human, range: SpeakerChangeRange) => void;
  editorRef?: TiptapEditor;
};

export type SpeakerChangeRange = "current" | "all" | "fromHere";

export type SpeakerViewInnerComponent = (props: SpeakerViewInnerProps) => JSX.Element;
