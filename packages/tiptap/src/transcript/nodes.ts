import { mergeAttributes, Node } from "@tiptap/core";

export const SpeakerLabelNode = Node.create({
  name: "speakerLabel",
  group: "block",
  content: "text*",
  parseHTML() {
    return [{ tag: "div.transcript-speaker-label" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({
        class: "transcript-speaker-label",
        contenteditable: "true",
      }, HTMLAttributes),
      0,
    ];
  },
});

export const SpeakerContentNode = Node.create({
  name: "speakerContent",
  group: "block",
  content: "word*",
  parseHTML() {
    return [{ tag: "div.transcript-speaker-content" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ class: "transcript-speaker-content" }, HTMLAttributes), 0];
  },
});

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
  content: "speakerLabel speakerContent+",
  addAttributes() {
    return {
      label: {
        default: "Unknown",
        parseHTML: element => element.getAttribute("data-speaker-label") || "Unknown",
        renderHTML: attributes => {
          return { "data-speaker-label": attributes.label };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: "div.transcript-speaker" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ class: "transcript-speaker" }, HTMLAttributes),
      0,
    ];
  },
});

export const WordNode = Node.create({
  name: "word",
  group: "inline",
  inline: true,
  atom: false,
  content: "text*",
  parseHTML() {
    return [{ tag: "span.transcript-word" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "transcript-word" }, HTMLAttributes), 0];
  },
});
