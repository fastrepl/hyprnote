import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

export const extensions = [
  StarterKit.configure({
    code: false,
    codeBlock: false,
    heading: {
      levels: [3],
    },
  }),
  Typography,
  Underline,
  Placeholder.configure({
    placeholder: "Take notes about the meeting...",
    emptyEditorClass: "is-editor-empty",
  }),
];
