import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";

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

              const tr = state.tr.split(splitPos, 1, [
                { type: state.schema.nodes.speaker },
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
