import type { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";

const docChangedByTransactionKey = new PluginKey<boolean>(
  "docChangedByTransaction",
);

export function docChangeListenerPlugin(
  onDocChanged: (doc: PMNode) => void,
  onContentSynced?: (doc: PMNode) => void,
) {
  return new Plugin({
    key: docChangedByTransactionKey,
    state: {
      init: () => false,
      apply(transaction, previous) {
        const appended = transaction.getMeta("appendedTransaction");
        if ((appended ?? transaction).getMeta("externalContentSync")) {
          return false;
        }
        if (transaction.docChanged && !appended && !previous) {
          // This plugin precedes history so the first user edit after sync starts a group.
          closeHistory(transaction);
        }
        return transaction.docChanged || previous;
      },
    },
    view() {
      return {
        update(view, prevState) {
          if (prevState.doc === view.state.doc) {
            return;
          }

          if (!docChangedByTransactionKey.getState(view.state)) {
            onContentSynced?.(view.state.doc);
            return;
          }

          onDocChanged(view.state.doc);
        },
      };
    },
  });
}
import { closeHistory } from "prosemirror-history";
