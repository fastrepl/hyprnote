import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

export const WordSplit = Extension.create({
  name: "wordSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("wordSplit"),
        props: {
          // Handle spaces to create new words
          handleKeyDown(view, event) {
            // Split word when user presses a plain space-bar
            if (
              event.key === " "
              && !event.ctrlKey
              && !event.metaKey
              && !event.altKey
            ) {
              const { state, dispatch } = view;
              const { selection } = state;

              // We only care about a collapsed selection inside a `word` node
              if (!selection.empty) {
                return false;
              }
              const $pos = selection.$from;
              const wordType = state.schema.nodes.word;
              if ($pos.parent.type !== wordType) {
                return false;
              }

              // If current word is still empty, ignore additional spaces
              if ($pos.parent.textContent.length === 0) {
                event.preventDefault();
                return true;
              }

              event.preventDefault(); // keep the browser from inserting the space

              // Insert a new (initially empty) `word` node right after the current one
              const posAfter = $pos.after();
              const tr = state.tr.insert(posAfter, wordType.create());

              // Place caret inside the freshly-created node
              tr.setSelection(TextSelection.create(tr.doc, posAfter + 1));

              dispatch(tr.scrollIntoView());
              return true;
            }
            return false;
          },

          // Handle pasting to split text into words
          handlePaste(view, event) {
            const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
            if (!text) {
              return false;
            }

            // Collapse consecutive whitespace → split into individual words
            const words = text.split(/\s+/).filter(Boolean);
            if (words.length <= 1) {
              return false; // let normal paste through
            }

            const { state, dispatch } = view;
            const wordType = state.schema.nodes.word;

            const nodes = words.map((w) => wordType.create(null, state.schema.text(w)));

            // Replace current selection with the new list of word nodes
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
