import { mergeAttributes, Node } from "@tiptap/core";
import { CommandProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Node as ProseNode } from "prosemirror-model";

import { createSpeakerView, SpeakerViewInnerComponent } from "./views";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    speaker: {
      updateSpeakerIndexToId: (
        speakerIndex: number,
        speakerId: string,
        speakerLabel?: string,
      ) => ReturnType;

      replaceSpeakerIdAtPos: (
        position: number,
        newSpeakerId: string,
        newSpeakerLabel?: string,
      ) => ReturnType;

      replaceAllSpeakerIds: (
        oldSpeakerId: string,
        newSpeakerId: string,
        newSpeakerLabel?: string,
      ) => ReturnType;

      replaceSpeakerIdsBefore: (
        position: number,
        oldSpeakerId: string,
        newSpeakerId: string,
        newSpeakerLabel?: string,
      ) => ReturnType;

      replaceSpeakerIdsAfter: (
        position: number,
        oldSpeakerId: string,
        newSpeakerId: string,
        newSpeakerLabel?: string,
      ) => ReturnType;
    };
  }
}

const implementCommands = {
  updateSpeakerIndexToId:
    (speakerIndex: number, speakerId: string, speakerLabel: string = "") => ({ tr, dispatch }: CommandProps) => {
      if (!dispatch) {
        return false;
      }
      let updated = false;
      tr.doc.descendants((node: ProseNode, pos: number) => {
        if (node.type.name === "speaker" && node.attrs["speaker-index"] === speakerIndex) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            "speaker-index": null,
            "speaker-id": speakerId,
            "speaker-label": speakerLabel,
          });
          updated = true;
        }
        return true;
      });

      if (updated) {
        dispatch(tr);
        return true;
      }
      return false;
    },

  replaceSpeakerIdAtPos:
    (position: number, newSpeakerId: string, newSpeakerLabel: string = "") => ({ tr, dispatch }: CommandProps) => {
      if (!dispatch) {
        return false;
      }
      const node = tr.doc.nodeAt(position);
      if (!node || node.type.name !== "speaker") {
        return false;
      }
      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        "speaker-id": newSpeakerId,
        "speaker-label": newSpeakerLabel,
      });
      dispatch(tr);
      return true;
    },

  replaceAllSpeakerIds:
    (oldSpeakerId: string, newSpeakerId: string, newSpeakerLabel: string = "") => ({ tr, dispatch }: CommandProps) => {
      if (!dispatch) {
        return false;
      }
      let updated = false;
      tr.doc.descendants((node: ProseNode, pos: number) => {
        if (node.type.name === "speaker" && node.attrs["speaker-id"] === oldSpeakerId) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            "speaker-id": newSpeakerId,
            "speaker-label": newSpeakerLabel,
          });
          updated = true;
        }
        return true;
      });
      if (updated) {
        dispatch(tr);
        return true;
      }
      return false;
    },

  replaceSpeakerIdsBefore:
    (position: number, oldSpeakerId: string, newSpeakerId: string, newSpeakerLabel: string = "") =>
    ({ tr, dispatch }: CommandProps) => {
      if (!dispatch) {
        return false;
      }
      let updated = false;
      tr.doc.descendants((node: ProseNode, pos: number) => {
        if (pos >= position) {
          return false;
        }
        if (node.type.name === "speaker" && node.attrs["speaker-id"] === oldSpeakerId) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            "speaker-id": newSpeakerId,
            "speaker-label": newSpeakerLabel,
          });
          updated = true;
        }
        return true;
      });
      if (updated) {
        dispatch(tr);
        return true;
      }
      return false;
    },

  replaceSpeakerIdsAfter:
    (position: number, oldSpeakerId: string, newSpeakerId: string, newSpeakerLabel: string = "") =>
    ({ tr, dispatch }: CommandProps) => {
      if (!dispatch) {
        return false;
      }
      let updated = false;
      tr.doc.descendants((node: ProseNode, pos: number) => {
        if (pos < position) {
          return true;
        }
        if (node.type.name === "speaker" && node.attrs["speaker-id"] === oldSpeakerId) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            "speaker-id": newSpeakerId,
            "speaker-label": newSpeakerLabel,
          });
          updated = true;
        }
        return true;
      });
      if (updated) {
        dispatch(tr);
        return true;
      }
      return false;
    },
};

export const SpeakerNode = (c: SpeakerViewInnerComponent) => {
  return Node.create({
    name: "speaker",
    group: "block",
    content: "word*",
    addAttributes() {
      return {
        "speaker-index": {
          default: null,
          parseHTML: element => {
            const v = element.getAttribute("data-speaker-index");
            return v !== null ? Number(v) : null;
          },
          renderHTML: attributes => ({ "data-speaker-index": attributes["speaker-index"] }),
        },
        "speaker-id": {
          default: null,
          parseHTML: element => element.getAttribute("data-speaker-id"),
          renderHTML: attributes => ({ "data-speaker-id": attributes["speaker-id"] }),
        },
        "speaker-label": {
          default: null,
          parseHTML: element => element.getAttribute("data-speaker-label"),
          renderHTML: attributes => ({ "data-speaker-label": attributes["speaker-label"] }),
        },
      };
    },
    parseHTML() {
      return [{
        tag: "div.transcript-speaker",
        attrs: { "data-speaker-index": 0, "data-speaker-id": "", "data-speaker-label": "" },
      }];
    },
    renderHTML({ HTMLAttributes, node }) {
      return [
        "div",
        mergeAttributes(
          {
            class: "transcript-speaker",
            "data-speaker-index": node.attrs["speaker-index"],
            "data-speaker-id": node.attrs["speaker-id"],
            "data-speaker-label": node.attrs["speaker-label"],
          },
          HTMLAttributes,
        ),
      ];
    },
    addNodeView() {
      return ReactNodeViewRenderer(createSpeakerView(c));
    },
    addCommands() {
      return implementCommands as any; // casting because util object is compatible
    },
  });
};

export const WordNode = Node.create({
  name: "word",
  group: "inline",
  inline: true,
  atom: false,
  content: "text*",
  addAttributes() {
    return {
      start_ms: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-start-ms");
          return value !== null ? Number(value) : null;
        },
        renderHTML: attributes => attributes.start_ms != null ? { "data-start-ms": attributes.start_ms } : {},
      },
      end_ms: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-end-ms");
          return value !== null ? Number(value) : null;
        },
        renderHTML: attributes => attributes.end_ms != null ? { "data-end-ms": attributes.end_ms } : {},
      },
      confidence: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-confidence");
          return value !== null ? Number(value) : null;
        },
        renderHTML: attributes => attributes.confidence != null ? { "data-confidence": attributes.confidence } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span.transcript-word" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "transcript-word" }, HTMLAttributes), 0];
  },
});
