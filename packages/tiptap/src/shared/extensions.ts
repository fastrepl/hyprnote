import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import ListKeymap from "@tiptap/extension-list-keymap";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { Hashtag } from "./hashtag";
import { ScrollPadding } from "./scroll-padding";

// TODO: Dark mode
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

      return "";
    },
    emptyNodeClass: "is-empty",
    showOnlyWhenEditable: true,
  }),
  Hashtag,
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    protocols: ["http", "https"],
    isAllowedUri: (url, ctx) => {
      try {
        const parsedUrl = url.includes(":") ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`);

        if (!ctx.defaultValidate(parsedUrl.href)) {
          return false;
        }

        const disallowedProtocols = ["ftp", "file"];
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
    shouldAutoLink: url => {
      try {
        const parsedUrl = url.includes(":") ? new URL(url) : new URL(`https://${url}`);

        const disallowedDomains = ["example-no-autolink.com", "another-no-autolink.com"];
        const domain = parsedUrl.hostname;

        return !disallowedDomains.includes(domain);
      } catch {
        return false;
      }
    },
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Highlight,
  ListKeymap,
  ScrollPadding.configure({ bottomPadding: 24 }),
];
