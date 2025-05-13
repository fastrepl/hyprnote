import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { StreamingAnimation } from "./animation";
import { ClipboardTextSerializer } from "./clipboard";
import CustomListKeymap from "./custom-list-keymap";
import { Hashtag } from "./hashtag";

export const extensions = [
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
  CustomListKeymap,
  StreamingAnimation,
  ClipboardTextSerializer,
];
