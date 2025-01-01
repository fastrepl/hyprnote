import { Extension } from "@tiptap/core";

// @ts-ignore
import uniqueId from "tiptap-unique-id";
import { nanoid } from "nanoid";

const types = ["paragraph", "heading", "orderedList", "bulletList", "listItem"];

export const UniqueID = uniqueId.configure({
  attributeName: "id",
  types,
  createId: () => nanoid(6),
});

export const HTML_ID = Extension.create({
  addGlobalAttributes() {
    return [
      {
        types,
        attributes: {
          _id: {
            default: "",
            renderHTML: ({ id }) => ({ id }),
            parseHTML: (element) => element.id,
          },
        },
      },
    ];
  },
});
