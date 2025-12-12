import { isNodeActive } from "@tiptap/core";
import { ListKeymap } from "@tiptap/extension-list-keymap";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const mergeAdjacentListsPluginKey = new PluginKey("mergeAdjacentLists");

export const CustomListKeymap = ListKeymap.extend({
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mergeAdjacentListsPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const { tr } = newState;
          let modified = false;

          newState.doc.descendants((node, pos, parent, index) => {
            if (modified) return false;

            if (
              node.type.name === "orderedList" ||
              node.type.name === "bulletList"
            ) {
              const nextIndex = index + 1;
              if (parent && nextIndex < parent.childCount) {
                const nextNode = parent.child(nextIndex);
                if (nextNode.type.name === node.type.name) {
                  const nodeEndPos = pos + node.nodeSize;
                  const nextNodeContent = nextNode.content;

                  tr.delete(nodeEndPos, nodeEndPos + nextNode.nodeSize);
                  tr.insert(pos + node.nodeSize - 1, nextNodeContent);

                  modified = true;
                  return false;
                }
              }
            }
            return true;
          });

          return modified ? tr : null;
        },
      }),
    ];
  },

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

        if (
          isNodeActive(state, listNodeType.name) &&
          selection.$from.parent.content.size === 0
        ) {
          return editor.chain().liftListItem(listNodeType.name).run();
        }

        return originalShortcuts.Enter
          ? originalShortcuts.Enter({ editor })
          : false;
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
          isNodeActive(state, listNodeType.name) &&
          selection.$from.parentOffset === 0 &&
          selection.$from.parent.content.size === 0
        ) {
          return editor.chain().liftListItem(listNodeType.name).run();
        }

        return originalShortcuts.Backspace
          ? originalShortcuts.Backspace({ editor })
          : false;
      },
    };
  },
});

export default CustomListKeymap;
