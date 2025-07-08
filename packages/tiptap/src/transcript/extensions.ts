import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

import { SPEAKER_NODE_NAME } from "./nodes";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    transcriptCommands: {
      serialize: () => ReturnType;
    };
  }
}

export const SpeakerSplit = Extension.create({
  name: "speakerSplit",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("hypr-speaker-split"),
        props: {
          handleKeyDown(view, event) {
            if (checkKey("Enter")(event)) {
              const { state, dispatch } = view;
              const { selection } = state;

              if (!selection.empty) {
                return false;
              }

              const $from = selection.$from;

              const parentOffset = $from.parentOffset;
              const textContent = $from.parent.textContent;

              let splitPos = $from.before() + parentOffset + 1;

              if (parentOffset < textContent.length) {
                const beforeChar = parentOffset > 0 ? textContent[parentOffset - 1] : " ";
                const afterChar = parentOffset < textContent.length ? textContent[parentOffset] : " ";

                if (beforeChar !== " " && afterChar !== " ") {
                  let wordStart = parentOffset;
                  while (wordStart > 0 && textContent[wordStart - 1] !== " ") {
                    wordStart--;
                  }

                  splitPos = $from.before() + wordStart + 1;
                }
              }

              const currentSpeakerNode = $from.node($from.depth);
              const speakerAttrs = currentSpeakerNode.type.name === SPEAKER_NODE_NAME
                ? currentSpeakerNode.attrs
                : {};

              const tr = state.tr.split(splitPos, 1, [
                { type: state.schema.nodes[SPEAKER_NODE_NAME], attrs: speakerAttrs },
              ]);

              const newPos = tr.mapping.map(splitPos);
              const newSelection = TextSelection.create(tr.doc, newPos);

              dispatch(tr.setSelection(newSelection).scrollIntoView());
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

const checkKey = (key: string) => (e: KeyboardEvent) => {
  return e.key === key
    && !e.ctrlKey
    && !e.metaKey
    && !e.altKey;
};
