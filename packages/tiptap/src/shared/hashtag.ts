import { Extension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const HASHTAG_REGEX = /#([\p{L}\p{N}_\p{Emoji}\p{Emoji_Component}]+)/gu;

export const Hashtag = Extension.create({
  name: "hashtag",

  addProseMirrorPlugins() {
    const decorationPlugin = new Plugin({
      key: new PluginKey("hashtagDecoration"),
      props: {
        decorations(state) {
          const { doc } = state;
          const decorations: Decoration[] = [];

          doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (!node.isText) {
              return;
            }

            const text = node.text as string;
            let match;

            HASHTAG_REGEX.lastIndex = 0;

            while ((match = HASHTAG_REGEX.exec(text)) !== null) {
              const start = pos + match.index;
              const end = start + match[0].length;

              decorations.push(
                Decoration.inline(start, end, {
                  class: "hashtag",
                }),
              );
            }
          });

          return DecorationSet.create(doc, decorations);
        },
      },
    });

    return [decorationPlugin];
  },
});
