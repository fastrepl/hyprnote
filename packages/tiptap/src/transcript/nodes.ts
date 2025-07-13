import { type CommandProps, mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { Node as ProseNode } from "prosemirror-model";

import { SPEAKER_ID_ATTR, SPEAKER_INDEX_ATTR, SPEAKER_LABEL_ATTR } from "./utils";
import { createSpeakerView, SpeakerViewInnerComponent } from "./views";

export const SPEAKER_NODE_NAME = "speaker";

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

      replaceSpeakerIdsAfter: (
        position: number,
        oldSpeakerId: string,
        newSpeakerId: string,
        newSpeakerLabel?: string,
      ) => ReturnType;

      replaceAllSpeakerIndices: (
        oldSpeakerIndex: number,
        newSpeakerId: string,
        newSpeakerLabel?: string,
      ) => ReturnType;

      replaceSpeakerIndicesAfter: (
        position: number,
        oldSpeakerIndex: number,
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
        if (node.type.name === SPEAKER_NODE_NAME && node.attrs[SPEAKER_INDEX_ATTR] === speakerIndex) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [SPEAKER_INDEX_ATTR]: null,
            [SPEAKER_ID_ATTR]: speakerId,
            [SPEAKER_LABEL_ATTR]: speakerLabel,
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
      if (!node || node.type.name !== SPEAKER_NODE_NAME) {
        return false;
      }
      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        [SPEAKER_ID_ATTR]: newSpeakerId,
        [SPEAKER_LABEL_ATTR]: newSpeakerLabel,
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
        if (node.type.name === SPEAKER_NODE_NAME && node.attrs[SPEAKER_ID_ATTR] === oldSpeakerId) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [SPEAKER_ID_ATTR]: newSpeakerId,
            [SPEAKER_LABEL_ATTR]: newSpeakerLabel,
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
        if (node.type.name === SPEAKER_NODE_NAME && node.attrs[SPEAKER_ID_ATTR] === oldSpeakerId) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [SPEAKER_ID_ATTR]: newSpeakerId,
            [SPEAKER_LABEL_ATTR]: newSpeakerLabel,
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

  replaceAllSpeakerIndices: (oldSpeakerIndex: number, newSpeakerId: string, newSpeakerLabel: string = "") =>
  (
    { tr, dispatch }: CommandProps,
  ) => {
    if (!dispatch) {
      return false;
    }
    let updated = false;
    tr.doc.descendants((node: ProseNode, pos: number) => {
      if (node.type.name === SPEAKER_NODE_NAME && node.attrs[SPEAKER_INDEX_ATTR] === oldSpeakerIndex) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          [SPEAKER_INDEX_ATTR]: null,
          [SPEAKER_ID_ATTR]: newSpeakerId,
          [SPEAKER_LABEL_ATTR]: newSpeakerLabel,
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

  replaceSpeakerIndicesAfter:
    (position: number, oldSpeakerIndex: number, newSpeakerId: string, newSpeakerLabel: string = "") =>
    ({ tr, dispatch }: CommandProps) => {
      if (!dispatch) {
        return false;
      }
      let updated = false;
      tr.doc.descendants((node: ProseNode, pos: number) => {
        if (pos < position) {
          return true;
        }
        if (node.type.name === SPEAKER_NODE_NAME && node.attrs[SPEAKER_INDEX_ATTR] === oldSpeakerIndex) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [SPEAKER_INDEX_ATTR]: null,
            [SPEAKER_ID_ATTR]: newSpeakerId,
            [SPEAKER_LABEL_ATTR]: newSpeakerLabel,
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
    name: SPEAKER_NODE_NAME,
    group: "block",
    content: "inline*",
    addAttributes() {
      return {
        [SPEAKER_INDEX_ATTR]: {
          default: null,
          parseHTML: element => {
            const v = element.getAttribute(`data-${SPEAKER_INDEX_ATTR}`);
            return v !== null ? Number(v) : null;
          },
          renderHTML: attributes => ({ [`data-${SPEAKER_INDEX_ATTR}`]: attributes[SPEAKER_INDEX_ATTR] }),
        },
        [SPEAKER_ID_ATTR]: {
          default: null,
          parseHTML: element => element.getAttribute(`data-${SPEAKER_ID_ATTR}`),
          renderHTML: attributes => ({ [`data-${SPEAKER_ID_ATTR}`]: attributes[SPEAKER_ID_ATTR] }),
        },
        [SPEAKER_LABEL_ATTR]: {
          default: null,
          parseHTML: element => element.getAttribute(`data-${SPEAKER_LABEL_ATTR}`),
          renderHTML: attributes => ({ [`data-${SPEAKER_LABEL_ATTR}`]: attributes[SPEAKER_LABEL_ATTR] }),
        },
      };
    },
    parseHTML() {
      return [{
        tag: "div.transcript-speaker",
        attrs: {
          [`data-${SPEAKER_INDEX_ATTR}`]: 0,
          [`data-${SPEAKER_ID_ATTR}`]: "",
          [`data-${SPEAKER_LABEL_ATTR}`]: "",
        },
      }];
    },
    renderHTML({ HTMLAttributes, node }) {
      return [
        "div",
        mergeAttributes(
          {
            class: "transcript-speaker",
            [`data-${SPEAKER_INDEX_ATTR}`]: node.attrs[SPEAKER_INDEX_ATTR],
            [`data-${SPEAKER_ID_ATTR}`]: node.attrs[SPEAKER_ID_ATTR],
            [`data-${SPEAKER_LABEL_ATTR}`]: node.attrs[SPEAKER_LABEL_ATTR],
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
