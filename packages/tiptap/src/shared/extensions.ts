import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import ListKeymap from "@tiptap/extension-list-keymap";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { Mention } from "./mention";

// TODO: Dark mode
export const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1],
    },
  }),
  Underline,
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "paragraph") {
        return "Start taking notes...";
      }
      return "";
    },
    emptyNodeClass: "is-empty",
    showOnlyWhenEditable: true,
  }),
  Mention({ trigger: "#" }),
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

        const disallowedProtocols = ["ftp", "file", "mailto"];
        const protocol = parsedUrl.protocol.replace(":", "");

        if (disallowedProtocols.includes(protocol)) {
          return false;
        }

        const allowedProtocols = ctx.protocols.map(p => (typeof p === "string" ? p : p.scheme));

        if (!allowedProtocols.includes(protocol)) {
          return false;
        }

        const disallowedDomains = ["example-phishing.com", "malicious-site.net"];
        const domain = parsedUrl.hostname;

        if (disallowedDomains.includes(domain)) {
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
];
