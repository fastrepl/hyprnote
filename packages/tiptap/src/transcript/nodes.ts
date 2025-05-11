import { mergeAttributes, Node } from "@tiptap/core";

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
  atom: true, // Make each word a leaf node that's edited as a whole
  content: "text*",
  addAttributes() {
    return {
      time: {
        default: 0,
        parseHTML: element => parseFloat(element.getAttribute("data-time") || "0"),
        renderHTML: attributes => {
          return { "data-time": attributes.time };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "span.transcript-word" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "transcript-word" }), 0];
  },
});
