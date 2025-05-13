import { isNodeActive } from "@tiptap/core";
import { ListKeymap } from "@tiptap/extension-list-keymap";

export const CustomListKeymap = ListKeymap.extend({
  addKeyboardShortcuts() {
    const originalShortcuts = this.parent?.() ?? {};

    const getListItemType = () => this.editor.schema.nodes.listItem;

    return {
      ...originalShortcuts,

      Enter: () => {
        const editor = this.editor;
        const state = editor.state;
        const { selection } = state;
        const listNodeType = getListItemType();

        if (!listNodeType) {
          return false;
        }

        if (isNodeActive(state, listNodeType.name) && selection.$from.parent.content.size === 0) {
          return editor.chain().liftListItem(listNodeType.name).run();
        }

        return originalShortcuts.Enter ? originalShortcuts.Enter({ editor }) : false;
      },

      Backspace: () => {
        const editor = this.editor;
        const state = editor.state;
        const { selection } = state;
        const listNodeType = getListItemType();

        if (!listNodeType) {
          return false;
        }

        if (
          isNodeActive(state, listNodeType.name)
          && selection.$from.parentOffset === 0
          && selection.$from.parent.content.size === 0
        ) {
          return editor.chain().liftListItem(listNodeType.name).run();
        }

        return originalShortcuts.Backspace ? originalShortcuts.Backspace({ editor }) : false;
      },
    };
  },
});

export default CustomListKeymap;
