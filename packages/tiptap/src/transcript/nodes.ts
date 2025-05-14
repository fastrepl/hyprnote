import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { SpeakerView } from "./views";

export const createSpeakerNode = (speakers: string[]) =>
  Node.create({
    name: "speaker",
    group: "block",
    content: "word*",
    addAttributes() {
      return {
        label: {
          default: speakers[0],
          parseHTML: element => {
            const label = element.getAttribute("data-speaker-label");
            return label && speakers.includes(label) ? label : speakers[0];
          },
          renderHTML: attributes => {
            const label = speakers.includes(attributes.label) ? attributes.label : speakers[0];
            return { "data-speaker-label": label };
          },
        },
        speakers: {
          default: speakers,
          renderHTML: () => ({}),
        },
      };
    },
    parseHTML() {
      return [{ tag: "div.transcript-speaker" }];
    },
    renderHTML({ HTMLAttributes, node }) {
      const label = node.attrs.label && speakers.includes(node.attrs.label) ? node.attrs.label : speakers[0];

      return [
        "div",
        mergeAttributes({ class: "transcript-speaker" }, HTMLAttributes),
        ["div", { class: "transcript-speaker-label" }, [
          "select",
          {
            class: "transcript-speaker-select",
            "data-speaker-label": label,
          },
          ...speakers.map(name => ["option", { value: name, selected: label === name }, name]),
        ]],
        ["div", { class: "transcript-speaker-content" }, 0],
      ];
    },
    addNodeView() {
      return ReactNodeViewRenderer(SpeakerView);
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
