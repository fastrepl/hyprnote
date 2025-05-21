import { Extension } from "@tiptap/core";
import { CommandProps, RawCommands } from "@tiptap/core";
import { splitBlock } from "prosemirror-commands";
import { Node } from "prosemirror-model";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

import { WordNode } from "./nodes";

const ZERO_WIDTH_SPACE = "\u200B";

export const WordSplit = Extension.create({
  name: "wordSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-word-split"),
        props: {
          handleKeyDown(view, event) {
            if (checkKey(" ")(event)) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const $pos = selection.$from;
              const WORD_NODE_TYPE = state.schema.nodes[WordNode.name];

              if ($pos.parent.type !== WORD_NODE_TYPE) {
                return false;
              }

              if ($pos.parent.textContent === ZERO_WIDTH_SPACE) {
                event.preventDefault();
                return true;
              }

              event.preventDefault();

              const posAfter = $pos.after();

              let transaction = state.tr.insert(
                posAfter,
                WORD_NODE_TYPE.create(
                  null,
                  state.schema.text(ZERO_WIDTH_SPACE),
                ),
              );
              const cursor = TextSelection.create(transaction.doc, posAfter + 2);
              transaction = transaction.setSelection(cursor);

              dispatch(transaction.scrollIntoView());
              return true;
            }

            if (checkKey("Backspace")(event)) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const $from = selection.$from;
              const WORD_NODE_TYPE = state.schema.nodes[WordNode.name];

              if ($from.parent.type !== WORD_NODE_TYPE) {
                return false;
              }

              if ($from.parentOffset > 0) {
                event.preventDefault();

                dispatch(
                  state.tr
                    .delete($from.pos - 1, $from.pos)
                    .scrollIntoView(),
                );

                return true;
              }

              return false;
            }

            return false;
          },

          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
            if (!text) {
              return false;
            }

            const words = text.split(/\s+/).filter(Boolean);
            if (words.length <= 1) {
              return false;
            }

            const { state, dispatch } = view;
            const wordType = state.schema.nodes.word;

            const nodes = words.map((w) => wordType.create(null, state.schema.text(w)));

            let tr = state.tr.deleteSelection();
            let insertPos = tr.selection.from;
            nodes.forEach((node) => {
              tr.insert(insertPos, node);
              insertPos += node.nodeSize;
            });

            dispatch(tr.scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});

export const SpeakerSplit = Extension.create({
  name: "speakerSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-speaker-split"),
        props: {
          handleKeyDown(view, event) {
            if (checkKey("Enter")(event)) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              event.preventDefault();

              const WORD = state.schema.nodes[WordNode.name];
              const $from = selection.$from;

              if ($from.parent.type === WORD) {
                const isFirstWord = $from.index(1) === 0;
                const isLastWord = $from.index(1) === $from.node(1).childCount - 1;
                const isAtEndOfWord = $from.parentOffset === $from.parent.content.size;

                if ((isFirstWord && !isAtEndOfWord) || isLastWord) {
                  return true;
                }

                const splitPos = isAtEndOfWord ? $from.after() : $from.before();
                const tr = state.tr.split(splitPos);

                const newPos = isAtEndOfWord
                  ? tr.mapping.map(splitPos + 1)
                  : tr.mapping.map($from.pos);

                const selection = TextSelection.create(tr.doc, newPos);
                dispatch(tr.setSelection(selection).scrollIntoView());

                return true;
              }

              return splitBlock(state, dispatch);
            }

            return false;
          },
        },
      }),
    ];
  },
});

const checkKey = (key: string) => (e: KeyboardEvent) => {
  return e.key === key
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey;
};

export const SpeakerCommands = Extension.create({
  name: "speakerCommands",

  addCommands() {
    return {
      // Update speaker index to id (remove index attribute, set id)
      updateSpeakerIndexToId:
        (speakerIndex: number, speakerId: string, speakerLabel: string = "") => ({ tr, dispatch }: CommandProps) => {
          if (!dispatch) {
            return false;
          }

          let updated = false;
          tr.doc.descendants((node: Node, pos: number) => {
            if (
              node.type.name === "speaker"
              && node.attrs["speaker-index"] === speakerIndex
            ) {
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

      // Replace a speaker ID with another ID for a specific node at position
      replaceSpeakerIdAtPos:
        (position: number, newSpeakerId: string, newSpeakerLabel: string = "") => ({ tr, dispatch }: CommandProps) => {
          if (!dispatch) {
            return false;
          }

          const node = tr.doc.nodeAt(position);
          if (node?.type.name !== "speaker") {
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

      // Replace all speaker IDs matching a specific ID with a new ID
      replaceAllSpeakerIds:
        (oldSpeakerId: string, newSpeakerId: string, newSpeakerLabel: string = "") =>
        ({ tr, dispatch }: CommandProps) => {
          if (!dispatch) {
            return false;
          }

          let updated = false;
          tr.doc.descendants((node: Node, pos: number) => {
            if (
              node.type.name === "speaker"
              && node.attrs["speaker-id"] === oldSpeakerId
            ) {
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

      // Replace all speaker IDs before a certain position
      replaceSpeakerIdsBefore:
        (position: number, oldSpeakerId: string, newSpeakerId: string, newSpeakerLabel: string = "") =>
        ({ tr, dispatch }: CommandProps) => {
          if (!dispatch) {
            return false;
          }

          let updated = false;
          tr.doc.descendants((node: Node, pos: number) => {
            if (pos >= position) {
              return false; // Stop when we reach the position
            }

            if (
              node.type.name === "speaker"
              && node.attrs["speaker-id"] === oldSpeakerId
            ) {
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

      // Replace all speaker IDs after a certain position
      replaceSpeakerIdsAfter:
        (position: number, oldSpeakerId: string, newSpeakerId: string, newSpeakerLabel: string = "") =>
        ({ tr, dispatch }: CommandProps) => {
          if (!dispatch) {
            return false;
          }

          let updated = false;
          tr.doc.descendants((node: Node, pos: number) => {
            if (pos < position) {
              return true; // Continue until we reach the position
            }

            if (
              node.type.name === "speaker"
              && node.attrs["speaker-id"] === oldSpeakerId
            ) {
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
    } as Partial<RawCommands>;
  },
});
