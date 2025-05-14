import { mergeAttributes, Node } from "@tiptap/core";

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
  content: "word*",
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
  renderHTML({ HTMLAttributes, node }) {
    return [
      "div",
      mergeAttributes({ class: "transcript-speaker" }, HTMLAttributes),
      ["div", { class: "transcript-speaker-label" }, [
        "select",
        {
          class: "transcript-speaker-select",
          "data-speaker-label": node.attrs.label,
        },
        ["option", { value: "Unknown", selected: node.attrs.label === "Unknown" }, "Unknown"],
        ["option", { value: "Speaker 1", selected: node.attrs.label === "Speaker 1" }, "Speaker 1"],
        ["option", { value: "Speaker 2", selected: node.attrs.label === "Speaker 2" }, "Speaker 2"],
        ["option", { value: "Speaker 3", selected: node.attrs.label === "Speaker 3" }, "Speaker 3"],
      ]],
      ["div", { class: "transcript-speaker-content" }, 0],
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
