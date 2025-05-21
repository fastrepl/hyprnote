import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { createSpeakerView, SpeakerViewInnerComponent } from "./views";

export const SpeakerNode = (c: SpeakerViewInnerComponent) => {
  return Node.create({
    name: "speaker",
    group: "block",
    content: "word*",
    addAttributes() {
      return {
        "speaker-index": {
          parseHTML: element => element.getAttribute("data-speaker-index"),
          renderHTML: attributes => ({ "data-speaker-index": attributes["speaker-index"] }),
        },
        "speaker-id": {
          parseHTML: element => element.getAttribute("data-speaker-id"),
          renderHTML: attributes => ({ "data-speaker-id": attributes["speaker-id"] }),
        },
        "speaker-label": {
          parseHTML: element => element.getAttribute("data-speaker-label"),
          renderHTML: attributes => ({ "data-speaker-label": attributes["speaker-label"] }),
        },
      };
    },
    parseHTML() {
      return [{
        tag: "div.transcript-speaker",
        attrs: { "data-speaker-index": 0, "data-speaker-id": "", "data-speaker-label": "" },
      }];
    },
    renderHTML({ HTMLAttributes, node }) {
      return [
        "div",
        mergeAttributes({
          class: "transcript-speaker",
          "data-speaker-index": node.attrs["speaker-index"],
          "data-speaker-id": node.attrs["speaker-id"],
          "data-speaker-label": node.attrs["speaker-label"],
        }, HTMLAttributes),
      ];
    },
    addNodeView() {
      return ReactNodeViewRenderer(createSpeakerView(c));
    },
  });
};

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
