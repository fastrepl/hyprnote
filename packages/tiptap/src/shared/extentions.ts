import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import clsx from "clsx";

export const extensions = [
  StarterKit,
  Highlight,
  Typography,
  Placeholder.configure({
    placeholder: "Jot down what's important. Hyprnote will handle the rest.",
    emptyEditorClass: clsx([
      "text-lg text-gray-400 first:float-left first:h-0 first:pointer-events-none first:before:content-[attr(data-placeholder)]",
      "tiptap-no-animate",
    ]),
  }),
];
