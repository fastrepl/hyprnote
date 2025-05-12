import { Extension } from "@tiptap/core";
import { splitBlockAs } from "prosemirror-commands";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

import { SpeakerNode, WordNode } from "./nodes";

const ZERO_WIDTH_SPACE = "\u200B";

export const WordSplit = Extension.create({
  name: "hypr-word-split",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-word-split"),
        props: {
          handleKeyDown(view, event) {
            if (
              event.key === " "
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
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

            if (
              event.key === "Backspace"
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
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
  name: "SpeakerSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-speaker-split"),
        props: {
          handleKeyDown(view, event) {
            if (
              event.key === "Enter"
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const SPEAKER_NODE_TYPE = state.schema.nodes[SpeakerNode.name];

              event.preventDefault();

              const cmd = splitBlockAs((node, _atEnd, _$from) => ({
                type: SPEAKER_NODE_TYPE,
                attrs: node.attrs,
              }));

              return cmd(state, dispatch);
            }

            return false;
          },
        },
      }),
    ];
  },
});
