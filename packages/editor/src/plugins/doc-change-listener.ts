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
      apply: (transaction, previous) =>
        (transaction.getMeta("appendedTransaction") ?? transaction).getMeta(
          "externalContentSync",
        )
          ? false
          : transaction.docChanged || previous,
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
