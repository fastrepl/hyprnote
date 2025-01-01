import { Extension } from "@tiptap/core";

// @ts-ignore
import uniqueId from "tiptap-unique-id";

export const UniqueID = uniqueId.configure({
  attributeName: "id",
  types: ["paragraph", "heading", "orderedList", "bulletList", "listItem"],
  createId: () => window.crypto.randomUUID(),
});

export const HTML_ID = Extension.create({
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "orderedList",
          "bulletList",
          "listItem",
        ],
        attributes: {
          _id: {
            default: "",
            renderHTML: (attributes) => ({
              id: attributes.id,
            }),
            parseHTML: (element) => element.id,
          },
        },
      },
    ];
  },
});
