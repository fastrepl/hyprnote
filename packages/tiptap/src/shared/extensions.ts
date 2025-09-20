import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import FileHandler from "@tiptap/extension-file-handler";

import { commands as miscCommands } from "@hypr/plugin-misc";

import { AIHighlight } from "./ai-highlight";
import { StreamingAnimation } from "./animation";
import { ClipboardTextSerializer } from "./clipboard";
import CustomListKeymap from "./custom-list-keymap";
import { Hashtag } from "./hashtag";

// Helper function to extract file extension
const getFileExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext || 'png';
};

export const createExtensions = (sessionId: string) => [
  StarterKit.configure({
    heading: {
      levels: [1],
    },
  }),
  Image,
  Underline,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "paragraph") {
        return "Start taking notes...";
      }

      if (node.type.name === "heading") {
        return "Heading";
      }

      if (node.type.name === "orderedList" || node.type.name === "bulletList" || node.type.name === "listItem") {
        return "List";
      }

      if (node.type.name === "taskList" || node.type.name === "taskItem") {
        return "To-do";
      }

      if (node.type.name === "blockquote") {
        return "Empty quote";
      }

      return "";
    },
    showOnlyWhenEditable: true,
  }),
  Hashtag,
  Link.configure({
    openOnClick: true,
    defaultProtocol: "https",
    protocols: ["http", "https"],
    isAllowedUri: (url, ctx) => {
      try {
        const parsedUrl = url.includes(":") ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`);

        if (!ctx.defaultValidate(parsedUrl.href)) {
          return false;
        }

        const disallowedProtocols = ["ftp", "file", "mailto"];
        const protocol = parsedUrl.protocol.replace(":", "");

        if (disallowedProtocols.includes(protocol)) {
          return false;
        }

        const allowedProtocols = ctx.protocols.map(p => (typeof p === "string" ? p : p.scheme));

        if (!allowedProtocols.includes(protocol)) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    shouldAutoLink: (url) => url.startsWith("https://") || url.startsWith("http://"),
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Highlight,
  AIHighlight,
  CustomListKeymap,
  StreamingAnimation,
  ClipboardTextSerializer,
  FileHandler.configure({
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    onDrop: async (currentEditor, files, pos) => {
      console.log("onDrop", files, pos)
      for (const file of files) {
        try {
          // Convert file to bytes
          const arrayBuffer = await file.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const extension = getFileExtension(file.name)
          
          // Upload via Tauri command
          const imageUrl = await miscCommands.imageUpload(sessionId, Array.from(bytes), extension)
          console.log("full note html: ", currentEditor.getHTML())
          
          // Insert URL (not base64!)
          currentEditor
            .chain()
            .insertContentAt(pos, {
              type: 'image',
              attrs: {
                src: imageUrl,
              },
            })
            .focus()
            .run()
        } catch (error) {
          console.error('Failed to upload image:', error)
        }
      }
    },
    onPaste: async (currentEditor, files, htmlContent) => {
      for (const file of files) {
        console.log("onPaste", files, htmlContent)
        if (htmlContent) {
          // if there is htmlContent, stop manual insertion & let other extensions handle insertion via inputRule
          console.log(htmlContent) // eslint-disable-line no-console
          return false
        }

        try {
          // Convert file to bytes
          const arrayBuffer = await file.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          const extension = getFileExtension(file.name)
          
          // Upload via Tauri command
          const imageUrl = await miscCommands.imageUpload(sessionId, Array.from(bytes), extension)
          console.log("full note html: ", currentEditor.getHTML())
          
          // Insert URL (not base64!)
          currentEditor
            .chain()
            .insertContentAt(currentEditor.state.selection.anchor, {
              type: 'image',
              attrs: {
                src: imageUrl,
              },
            })
            .focus()
            .run()
        } catch (error) {
          console.error('Failed to upload image:', error)
        }
      }
    },
  }),
];

// For backward compatibility - default extensions without session ID
export const extensions = createExtensions('');
