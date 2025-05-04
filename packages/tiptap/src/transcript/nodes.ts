import { mergeAttributes, Node } from "@tiptap/core";

import "./styles.css";

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
  content: "word*",
  parseHTML() {
    return [{ tag: "div.transcript-speaker" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "transcript-speaker" }), 0];
  },
});

export const WordNode = Node.create({
  name: "word",
  group: "inline",
  inline: true,
  content: "text*",

  parseHTML() {
    return [{ tag: "span[data-type=\"word\"]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "word",
        class: "transcript-word",
      }),
      0,
    ];
  },
});
