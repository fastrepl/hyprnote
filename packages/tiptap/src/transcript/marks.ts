import { Mark, mergeAttributes } from "@tiptap/core";

export const ConfidenceMark = Mark.create({
  name: "confidence",

  addAttributes() {
    return {
      confidence: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-confidence");
          return value ? parseFloat(value) : null;
        },
        renderHTML: attributes => {
          if (attributes.confidence === null) {
            return {};
          }
          return {
            "data-confidence": attributes.confidence,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-confidence]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: "transcript-word",
      }),
      0,
    ];
  },
});
