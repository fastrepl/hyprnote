import { Extension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance, Props } from "tippy.js";
import { HashtagList, HashtagListRef } from "./hashtag-list";

const AVAILABLE_TAGS = [
  "product",
  "platform",
  "packaging",
  "participants",
  "project",
  "priority",
  "progress",
  "performance",
  "planning",
  "process",
  "problem",
  "proposal",
  "prototype",
  "partner",
  "policy",
  "personal",
  "public",
  "private",
  "pending",
  "postponed",
];

const HASHTAG_REGEX = /#(\w+)/g;

const CURRENT_HASHTAG_REGEX = /#(\w*)$/;

export const Hashtag = Extension.create({
  name: "hashtag",

  addProseMirrorPlugins() {
    let tippyInstance: Instance<Props> | null = null;
    let reactRenderer: ReactRenderer<HashtagListRef> | null = null;

    function showSuggestions(view: any, items: string[]) {
      const { state } = view;
      const { selection } = state;

      reactRenderer = new ReactRenderer(HashtagList, {
        props: {
          items,
          command: ({ id }: { id: string }) => {
            const { tr } = view.state;
            const { $from, $to } = view.state.selection;

            const text = $from.parent.textContent;
            const hashIndex = text.lastIndexOf("#", $from.parentOffset);

            if (hashIndex !== -1) {
              const start = $from.start() + hashIndex;
              const end = $from.pos;

              view.dispatch(
                tr.insertText(`#${id}`, start, end),
              );
            }

            if (tippyInstance) {
              tippyInstance.hide();
            }

            view.focus();
          },
        },
        editor: view.editor,
      });

      const editorElement = view.dom;

      tippyInstance = tippy(document.createElement("div"), {
        getReferenceClientRect: () => {
          const coords = view.coordsAtPos(selection.$anchor.pos);

          return {
            top: coords.top,
            left: coords.left,
            bottom: coords.bottom,
            right: coords.right,
            width: 0,
            height: coords.bottom - coords.top,
            x: coords.left,
            y: coords.top,
            toJSON: () => ({}),
          };
        },
        appendTo: () => document.body,
        content: reactRenderer.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
        zIndex: 9999,
      });

      const onDocClick = (e: MouseEvent) => {
        if (tippyInstance && !editorElement.contains(e.target as unknown as Node)) {
          tippyInstance.hide();
        }
      };

      document.addEventListener("click", onDocClick);

      tippyInstance.setProps({
        onHide() {
          document.removeEventListener("click", onDocClick);
          tippyInstance = null;

          if (reactRenderer) {
            reactRenderer.destroy();
            reactRenderer = null;
          }
        },
      });
    }

    function updateSuggestions(items: string[]) {
      if (reactRenderer) {
        reactRenderer.updateProps({ items });
      }
    }

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

    const suggestionPlugin = new Plugin({
      key: new PluginKey("hashtagSuggestion"),
      props: {
        handleKeyDown(view, event) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;

          const textBeforeCursor = $from.parent.textContent.slice(0, $from.parentOffset);

          const match = textBeforeCursor.match(CURRENT_HASHTAG_REGEX);

          if (!match) {
            if (tippyInstance) {
              tippyInstance.hide();
            }
            return false;
          }

          const query = match[1] || "";

          const filteredSuggestions = AVAILABLE_TAGS
            .filter(tag => tag.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 5);

          if (filteredSuggestions.length > 0) {
            if (!tippyInstance) {
              showSuggestions(view, filteredSuggestions);
            } else {
              updateSuggestions(filteredSuggestions);
            }
          } else if (tippyInstance) {
            tippyInstance.hide();
          }

          return false;
        },
      },
    });

    return [decorationPlugin, suggestionPlugin];
  },
});
