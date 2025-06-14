import { type Editor as TiptapEditor } from "@tiptap/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, memo, useCallback } from "react";

import type { Human } from "@hypr/plugin-db";
import { SPEAKER_ID_ATTR, SPEAKER_INDEX_ATTR, SPEAKER_LABEL_ATTR } from "./utils";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return memo(({ node, editor, updateAttributes }: NodeViewProps) => {
    const speakerId = node.attrs?.[SPEAKER_ID_ATTR] ?? undefined;
    const speakerIndex = node.attrs?.[SPEAKER_INDEX_ATTR] ?? undefined;
    const speakerLabel = node.attrs?.[SPEAKER_LABEL_ATTR] ?? undefined;

    const onSpeakerChange = useCallback((speaker: Human, range: SpeakerChangeRange) => {
      if (range === "current") {
        updateAttributes({ [SPEAKER_ID_ATTR]: speaker.id });
        updateAttributes({ [SPEAKER_LABEL_ATTR]: speaker.full_name });
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
