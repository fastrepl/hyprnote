import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";

export const WordSplit = Extension.create({
  name: "wordSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wordSplit"),
        props: {
          // Handle spaces to create new words
          handleKeyDown: (view, event) => {
            if (event.key === " " && !event.ctrlKey && !event.metaKey) {
              const { state, dispatch } = view;
              const { selection } = state;

              // Only handle if we're inside a word node
              const $pos = selection.$from;
              const parent = $pos.parent;

              if (parent.type.name === "word") {
                // Create a new empty word node after this one
                const pos = $pos.after();

                dispatch(
                  state.tr
                    .insert(pos, this.editor.schema.nodes.word.create())
                    .setSelection(TextSelection.near(state.doc.resolve(pos + 1))),
                );

                return true;
              }
            }
            return false;
          },

          // Handle pasting to split text into words
          handlePaste: (view, event, slice) => {
            if (slice.content.firstChild?.type.name === "text") {
              const text = slice.content.firstChild.text;
              if (!text) {
                return false;
              }

              const words = text.split(/\s+/);
              if (words.length <= 1) {
                return false;
              }

              const { state, dispatch } = view;
              const { selection } = state;
              const tr = state.tr;

              // Create word nodes for each word
              const nodes = words
                .filter(word => word.trim())
                .map(word => {
                  return this.editor.schema.nodes.word.create(
                    null,
                    this.editor.schema.text(word),
                  );
                });

              if (nodes.length === 0) {
                return false;
              }

              tr.deleteSelection();
              nodes.forEach((node, i) => {
                tr.insert(selection.from + i, node);
              });

              dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
