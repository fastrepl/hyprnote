import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { SpeakerView } from "./views";

export interface Speaker {
  id: string;
  name: string;
}

export const SpeakerNode = Node.create({
  name: "speaker",
  group: "block",
  content: "word*",
  addAttributes() {
    return {
      speakerId: {
        parseHTML: element => element.getAttribute("data-speaker-id"),
        renderHTML: attributes => ({ "data-speaker-id": attributes.speakerId }),
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
      ["div", { class: "transcript-speaker-id" }, node.attrs.speakerId ?? ""],
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
  addAttributes() {
    return {
      start_ms: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-start-ms");
          return value !== null ? Number(value) : null;
        },
        renderHTML: attributes => attributes.start_ms != null ? { "data-start-ms": attributes.start_ms } : {},
      },
      end_ms: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-end-ms");
          return value !== null ? Number(value) : null;
        },
        renderHTML: attributes => attributes.end_ms != null ? { "data-end-ms": attributes.end_ms } : {},
      },
      confidence: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-confidence");
          return value !== null ? Number(value) : null;
        },
        renderHTML: attributes => attributes.confidence != null ? { "data-confidence": attributes.confidence } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span.transcript-word" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "transcript-word" }, HTMLAttributes), 0];
  },
});
