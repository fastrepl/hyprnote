import { Extension } from "@tiptap/core";

const types = ["paragraph", "heading", "orderedList", "bulletList", "listItem"];

export const HTML_ID = Extension.create({
  addGlobalAttributes() {
    return [
      {
        types,
        attributes: {
          id: {
            default: "",
            renderHTML: ({ id }) => ({ id }),
            parseHTML: (element) => element.id,
          },
        },
      },
    ];
  },
});
