import { Extension } from "@tiptap/core";
import { EditorState, Plugin, PluginKey, Transaction } from "@tiptap/pm/state";

export const EDITOR_CONTENT_AREA_ID = "editor-content-area";

export const ScrollPadding = Extension.create({
  name: "scrollPadding",

  addOptions() {
    return {
      bottomPadding: 24,
    };
  },

  addProseMirrorPlugins() {
    const { bottomPadding } = this.options;

    return [
      new Plugin({
        key: new PluginKey("scrollPadding"),

        appendTransaction(transactions: readonly Transaction[], oldState: EditorState, newState: EditorState) {
          const docChanged = transactions.some((tr: Transaction) => tr.docChanged);
          if (!docChanged) {
            return null;
          }

          const editorDOM = document.querySelector(".tiptap");
          if (!editorDOM) {
            return null;
          }

          const scrollContainer = document.getElementById(EDITOR_CONTENT_AREA_ID);
          if (!scrollContainer) {
            return null;
          }

          setTimeout(() => {
            const posDOM = editorDOM.querySelector("p:last-child, h1:last-child");
            if (!posDOM) {
              return;
            }

            const posRect = posDOM.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            if (posRect.bottom > containerRect.bottom - bottomPadding) {
              const additionalScroll = posRect.bottom - (containerRect.bottom - bottomPadding);
              scrollContainer.scrollTop += additionalScroll;
            }
          }, 0);

          return null;
        },
      }),
    ];
  },
});
