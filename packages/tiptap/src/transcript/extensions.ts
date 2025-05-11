import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

import { WordNode } from "./nodes";

export const WordSplit = Extension.create({
  name: "wordSplit",

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

              if ($pos.parent.textContent.length === 0) {
                event.preventDefault();
                return true;
              }

              event.preventDefault();

              const posAfter = $pos.after();

              // a ⇢ zero-width space that will immediately disappear on first Backspace
              const ZWSP = "\u200B";

              // create the word with one zero-width space so the node is never empty
              const newWord = WORD_NODE_TYPE.create(
                null,
                state.schema.text(ZWSP),
              );

              let tr = state.tr.insert(posAfter, newWord);

              // inside the node, *after* the ZWSP  (posAfter + 2, because nodeSize = 3)
              const insidePos = posAfter + 2;

              tr = tr.setSelection(
                TextSelection.near(tr.doc.resolve(insidePos), 1),
              );

              dispatch(tr.scrollIntoView());
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

              // ── 1. Delete the character before the caret ───────────────────
              if ($from.parentOffset > 0) {
                event.preventDefault();
                dispatch(
                  state.tr
                    .delete($from.pos - 1, $from.pos) // remove 1 char
                    .scrollIntoView(),
                );
                return true;
              }

              // ── 2. At offset 0: join with the previous `word` if there is one
              const joinPos = $from.before(); // between the two words
              if (state.doc.nodeAt(joinPos - 1)?.type === WORD_NODE_TYPE) {
                event.preventDefault();
                dispatch(state.tr.join(joinPos).scrollIntoView());
                return true;
              }

              return false; // let other plugins handle it
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
