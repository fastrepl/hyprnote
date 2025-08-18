import { Mark, mergeAttributes } from "@tiptap/core";

export const InterimMark = Mark.create({
  name: "interim",

  addAttributes() {
    return {
      interim: {
        default: null,
        parseHTML: element => {
          const value = element.getAttribute("data-interim");
          return value ? parseFloat(value) : null;
        },
        renderHTML: attributes => {
          if (attributes.interim === null) {
            return {};
          }
          return {
            "data-interim": attributes.interim,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-interim]",
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
