import { type Editor as TiptapEditor } from "@tiptap/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, memo, useCallback } from "react";

import type { Human } from "@hypr/plugin-db";
import { SPEAKER_ID_ATTR, SPEAKER_INDEX_ATTR, SPEAKER_LABEL_ATTR } from "./utils";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return memo(({ node, editor, updateAttributes, getPos }: NodeViewProps) => {
    const speakerId = node.attrs?.[SPEAKER_ID_ATTR] ?? undefined;
    const speakerIndex = node.attrs?.[SPEAKER_INDEX_ATTR] ?? undefined;
    const speakerLabel = node.attrs?.[SPEAKER_LABEL_ATTR] ?? undefined;
    const nodePos = typeof getPos === "function" ? getPos() : undefined;

    const onSpeakerChange = useCallback((speaker: Human, range: SpeakerChangeRange) => {
      const newSpeakerId = speaker.id;
      const newSpeakerLabel = speaker.full_name || "";

      if (range === "current") {
        updateAttributes({
          [SPEAKER_ID_ATTR]: newSpeakerId,
          [SPEAKER_LABEL_ATTR]: newSpeakerLabel,
          [SPEAKER_INDEX_ATTR]: null,
        });
      } else if (range === "all") {
        if (speakerId) {
          editor.commands.replaceAllSpeakerIds(speakerId, newSpeakerId, newSpeakerLabel);
        } else if (typeof speakerIndex === "number") {
          editor.commands.replaceAllSpeakerIndices(speakerIndex, newSpeakerId, newSpeakerLabel);
        }
      } else if (range === "fromHere" && nodePos !== undefined) {
        if (speakerId) {
          editor.commands.replaceSpeakerIdsAfter(nodePos, speakerId, newSpeakerId, newSpeakerLabel);
        } else if (typeof speakerIndex === "number") {
          editor.commands.replaceSpeakerIndicesAfter(nodePos, speakerIndex, newSpeakerId, newSpeakerLabel);
        }
      }
    }, [updateAttributes, editor, speakerId, speakerIndex, nodePos]);

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
    const prevAttrs = prevProps.node.attrs;
    const nextAttrs = nextProps.node.attrs;

    return prevAttrs[SPEAKER_ID_ATTR] === nextAttrs[SPEAKER_ID_ATTR]
      && prevAttrs[SPEAKER_INDEX_ATTR] === nextAttrs[SPEAKER_INDEX_ATTR]
      && prevAttrs[SPEAKER_LABEL_ATTR] === nextAttrs[SPEAKER_LABEL_ATTR];
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
