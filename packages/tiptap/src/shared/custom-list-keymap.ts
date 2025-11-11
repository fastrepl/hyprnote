import { isNodeActive } from "@tiptap/core";
import { ListKeymap } from "@tiptap/extension-list-keymap";

export const CustomListKeymap = ListKeymap.extend({
  addKeyboardShortcuts() {
    const originalShortcuts = this.parent?.() ?? {};

    const getListItemType = () => this.editor.schema.nodes.listItem;
    const getSupportedListItemNames = () => {
      const listTypes = this.options.listTypes ?? [];

      return listTypes
        .map(({ itemName }) => this.editor.schema.nodes[itemName]?.name)
        .filter((itemName): itemName is string => typeof itemName === "string");
    };
    const runListIndentCommand = (command: "sinkListItem" | "liftListItem") => {
      const editor = this.editor;
      const { state } = editor;

      for (const itemName of getSupportedListItemNames()) {
        if (!isNodeActive(state, itemName)) {
          continue;
        }

        const chain = editor.chain().focus(undefined, { scrollIntoView: false });
        const executed = command === "sinkListItem"
          ? chain.sinkListItem(itemName).run()
          : chain.liftListItem(itemName).run();

        if (executed) {
          return true;
        }
      }

      return false;
    };

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

      Tab: () => {
        const editor = this.editor;

        if (runListIndentCommand("sinkListItem")) {
          return true;
        }

        return originalShortcuts.Tab ? originalShortcuts.Tab({ editor }) : false;
      },

      "Shift-Tab": () => {
        const editor = this.editor;

        if (runListIndentCommand("liftListItem")) {
          return true;
        }

        return originalShortcuts["Shift-Tab"] ? originalShortcuts["Shift-Tab"]({ editor }) : false;
      },
    };
  },
});

export default CustomListKeymap;
