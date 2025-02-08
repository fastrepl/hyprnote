import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

export const extensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    heading: {
      levels: [1],
    },
  }),
  Underline,
  Placeholder.configure({
    placeholder: "Take notes about the meeting...",
    emptyEditorClass: "is-editor-empty",
  }),
];
