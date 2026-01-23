import FileHandler from "@tiptap/extension-file-handler";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { AIHighlight } from "../ai-highlight";
import { StreamingAnimation } from "../animation";
import { ClipboardTextSerializer } from "../clipboard";
import CustomListKeymap from "../custom-list-keymap";
import { Hashtag } from "../hashtag";
import { Placeholder, type PlaceholderFunction } from "./placeholder";
import { SearchAndReplace } from "./search-and-replace";

export type { PlaceholderFunction };

export type FileHandlerConfig = {
  onDrop?: (files: File[], editor: any, position?: number) => boolean | void;
  onPaste?: (files: File[], editor: any) => boolean | void;
  onImageUpload?: (file: File) => Promise<string>;
};

export type ExtensionOptions = {
  imageExtension?: ReturnType<typeof Image.extend>;
};

const AttachmentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-attachment-id"),
        renderHTML: (attributes) => {
          if (!attributes.attachmentId) {
            return {};
          }
          return { "data-attachment-id": attributes.attachmentId };
        },
      },
    };
  },

  parseMarkdown: (token: { href?: string; text?: string; title?: string }) => {
    return {
      type: "image",
      attrs: {
        src: token.href || "",
        alt: token.text || "",
        title: token.title || null,
      },
    };
  },

  renderMarkdown: (node: {
    attrs?: { src?: string; alt?: string; title?: string };
  }) => {
    const src = node.attrs?.src || "";
    const alt = node.attrs?.alt || "";
    const title = node.attrs?.title;
    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },
});

export const getExtensions = (
  placeholderComponent?: PlaceholderFunction,
  fileHandlerConfig?: FileHandlerConfig,
  options?: ExtensionOptions,
) => [
  // https://tiptap.dev/docs/editor/extensions/functionality/starterkit
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    underline: false,
    link: false,
    listKeymap: false,
  }),
  (options?.imageExtension ?? AttachmentImage).configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: { class: "tiptap-image" },
    resize: { enabled: true },
  }),
  Underline,
  Placeholder.configure({
    placeholder:
      placeholderComponent ??
      (({ node }) => {
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
        const parsedUrl = url.includes(":")
          ? new URL(url)
          : new URL(`${ctx.defaultProtocol}://${url}`);

        if (!ctx.defaultValidate(parsedUrl.href)) {
          return false;
        }

        const disallowedProtocols = ["ftp", "file", "mailto"];
        const protocol = parsedUrl.protocol.replace(":", "");

        if (disallowedProtocols.includes(protocol)) {
          return false;
        }

        const allowedProtocols = ctx.protocols.map((p) =>
          typeof p === "string" ? p : p.scheme,
        );

        if (!allowedProtocols.includes(protocol)) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    shouldAutoLink: (url) =>
      url.startsWith("https://") || url.startsWith("http://"),
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight,
  AIHighlight,
  CustomListKeymap,
  StreamingAnimation,
  ClipboardTextSerializer,
  SearchAndReplace.configure({
    searchResultClass: "search-result",
    disableRegex: true,
  }),
  ...(fileHandlerConfig
    ? [
        FileHandler.configure({
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
          ],
          onDrop: (currentEditor, files, pos) => {
            if (fileHandlerConfig.onDrop) {
              const result = fileHandlerConfig.onDrop(
                files,
                currentEditor,
                pos,
              );
              if (result === false) return false;
            }

            (async () => {
              for (const file of files) {
                if (fileHandlerConfig.onImageUpload) {
                  try {
                    const url = await fileHandlerConfig.onImageUpload(file);
                    currentEditor
                      .chain()
                      .insertContentAt(pos, {
                        type: "image",
                        attrs: {
                          src: url,
                        },
                      })
                      .focus()
                      .run();
                  } catch (error) {
                    console.error("Failed to upload image:", error);
                  }
                } else {
                  const fileReader = new FileReader();

                  fileReader.readAsDataURL(file);
                  fileReader.onload = () => {
                    currentEditor
                      .chain()
                      .insertContentAt(pos, {
                        type: "image",
                        attrs: {
                          src: fileReader.result,
                        },
                      })
                      .focus()
                      .run();
                  };
                }
              }
            })();

            return true;
          },
          onPaste: (currentEditor, files) => {
            if (fileHandlerConfig.onPaste) {
              const result = fileHandlerConfig.onPaste(files, currentEditor);
              if (result === false) return false;
            }

            (async () => {
              for (const file of files) {
                if (fileHandlerConfig.onImageUpload) {
                  try {
                    const url = await fileHandlerConfig.onImageUpload(file);
                    const imageNode = {
                      type: "image",
                      attrs: {
                        src: url,
                      },
                    };
                    currentEditor
                      .chain()
                      .focus()
                      .insertContent(imageNode)
                      .run();
                  } catch (error) {
                    console.error("Failed to upload image:", error);
                  }
                } else {
                  const fileReader = new FileReader();

                  fileReader.readAsDataURL(file);
                  fileReader.onload = () => {
                    const imageNode = {
                      type: "image",
                      attrs: {
                        src: fileReader.result,
                      },
                    };

                    currentEditor
                      .chain()
                      .focus()
                      .insertContent(imageNode)
                      .run();
                  };
                }
              }
            })();

            return true;
          },
        }),
      ]
    : []),
];

export const extensions = getExtensions();
