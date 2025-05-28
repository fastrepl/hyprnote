import { type Editor as TiptapEditor } from "@tiptap/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { type ComponentType, memo, useCallback, useEffect, useState } from "react";

import type { Human } from "@hypr/plugin-db";

export const createSpeakerView = (Comp: SpeakerViewInnerComponent): ComponentType<NodeViewProps> => {
  return memo(({ node, updateAttributes, editor }: NodeViewProps) => {
    const speakerId = node.attrs?.["speaker-id"] ?? undefined;
    const speakerIndex = node.attrs?.["speaker-index"] ?? undefined;
    const speakerLabel = node.attrs?.["speaker-label"] ?? undefined;

    const onSpeakerChange = useCallback((speaker: Human, range: SpeakerChangeRange) => {
      if (range === "current") {
        updateAttributes({
          "speaker-id": speaker.id,
          "speaker-label": speaker.full_name,
          "speaker-index": null,
        });
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
    // Only re-render if node attributes actually changed
    const prevAttrs = prevProps.node.attrs;
    const nextAttrs = nextProps.node.attrs;

    return prevAttrs?.["speaker-id"] === nextAttrs?.["speaker-id"]
      && prevAttrs?.["speaker-index"] === nextAttrs?.["speaker-index"]
      && prevAttrs?.["speaker-label"] === nextAttrs?.["speaker-label"]
      && prevProps.selected === nextProps.selected;
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
