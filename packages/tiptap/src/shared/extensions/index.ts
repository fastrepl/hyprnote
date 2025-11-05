import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Code from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Dropcursor from "@tiptap/extension-dropcursor";
import Gapcursor from "@tiptap/extension-gapcursor";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import History from "@tiptap/extension-history";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Italic from "@tiptap/extension-italic";
import Link from "@tiptap/extension-link";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";

import { AIHighlight } from "../ai-highlight";
import { StreamingAnimation } from "../animation";
import { ClipboardTextSerializer } from "../clipboard";
import CustomListKeymap from "../custom-list-keymap";
import { Hashtag } from "../hashtag";
import { Placeholder, type PlaceholderFunction } from "./placeholder";
import { SearchAndReplace } from "./search-and-replace";

export type { PlaceholderFunction };

// https://tiptap.dev/docs/editor/extensions/functionality/starterkit
// Excluded: Listkeymap, Link, Underline
const starter = [
  Document,
  Paragraph,
  Text,
  Blockquote,
  BulletList,
  CodeBlock,
  HardBreak,
  Heading.configure({ levels: [1, 2, 3] }),
  HorizontalRule,
  ListItem,
  OrderedList,
  Bold,
  Code,
  Italic,
  Strike,
  Dropcursor,
  Gapcursor,
  History,
];

export const getExtensions = (placeholderComponent?: PlaceholderFunction) => [
  ...starter,
  Image,
  Underline,
  Placeholder.configure({
    placeholder: placeholderComponent ?? (({ node }) => {
      if (node.type.name === "paragraph") {
        return "Start taking notes...";
      }
      return "";
    }),
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
  SearchAndReplace.configure({
    searchResultClass: "search-result",
    disableRegex: true,
  }),
];

export const extensions = getExtensions();
