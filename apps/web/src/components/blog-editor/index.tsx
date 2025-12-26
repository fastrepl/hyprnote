import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

import Editor, {
  type JSONContent,
  type TiptapEditor,
} from "@hypr/tiptap/editor";
import { cn } from "@hypr/utils";

import { CtaCard } from "@/components/cta-card";
import { Image } from "@/components/image";
import { Callout } from "@/components/mdx/callout";
import { saveArticle, uploadBlogImage } from "@/functions/blog";

const AUTHORS = ["Harshika", "John Jeong", "Yujong Lee"] as const;
const CATEGORIES = [
  "Case Study",
  "Hyprnote Weekly",
  "Productivity Hack",
  "Engineering",
] as const;

type ArticleData = {
  slug: string;
  sha?: string;
  display_title?: string;
  meta_title?: string;
  meta_description?: string;
  author?: string;
  created?: string;
  updated?: string;
  coverImage?: string;
  featured?: boolean;
  published?: boolean;
  category?: string;
  content?: string;
};

interface BlogEditorProps {
  mode: "new" | "edit";
  initialData?: ArticleData;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function jsonToMarkdown(json: JSONContent): string {
  if (!json || !json.content) return "";

  const processNode = (node: JSONContent): string => {
    if (!node) return "";

    switch (node.type) {
      case "doc":
        return (node.content || []).map(processNode).join("\n\n");

      case "paragraph": {
        const paragraphContent = (node.content || []).map(processNode).join("");
        if (paragraphContent.match(/^<(Image|Callout|CtaCard)/)) {
          return paragraphContent;
        }
        return paragraphContent;
      }

      case "text":
        let text = node.text || "";
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                text = `**${text}**`;
                break;
              case "italic":
                text = `*${text}*`;
                break;
              case "code":
                text = `\`${text}\``;
                break;
              case "link":
                text = `[${text}](${mark.attrs?.href || ""})`;
                break;
            }
          }
        }
        return text;

      case "heading": {
        const level = node.attrs?.level || 1;
        const headingText = (node.content || []).map(processNode).join("");
        return `${"#".repeat(level)} ${headingText}`;
      }

      case "bulletList":
        return (node.content || [])
          .map((item) => `- ${processNode(item)}`)
          .join("\n");

      case "orderedList":
        return (node.content || [])
          .map((item, i) => `${i + 1}. ${processNode(item)}`)
          .join("\n");

      case "listItem":
        return (node.content || []).map(processNode).join("\n");

      case "codeBlock": {
        const lang = node.attrs?.language || "";
        const code = (node.content || []).map(processNode).join("");
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      }

      case "blockquote":
        return (node.content || [])
          .map((n) => `> ${processNode(n)}`)
          .join("\n");

      case "horizontalRule":
        return "---";

      case "image": {
        const src = node.attrs?.src || "";
        const alt = node.attrs?.alt || "";
        return `<Image src="${src}" alt="${alt}"/>`;
      }

      case "taskList":
        return (node.content || []).map(processNode).join("\n");

      case "taskItem": {
        const checked = node.attrs?.checked ? "x" : " ";
        const taskContent = (node.content || []).map(processNode).join("");
        return `- [${checked}] ${taskContent}`;
      }

      default:
        if (node.content) {
          return (node.content || []).map(processNode).join("");
        }
        return "";
    }
  };

  return processNode(json);
}

function markdownToJson(markdown: string): JSONContent {
  const lines = markdown.split("\n");
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: [{ type: "text", text: headingMatch[2] }],
      });
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push({
        type: "codeBlock",
        attrs: { language: lang },
        content: [{ type: "text", text: codeLines.join("\n") }],
      });
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      content.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: line.slice(2) }],
          },
        ],
      });
      i++;
      continue;
    }

    if (line.match(/^[-*]\s+/)) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        const itemText = lines[i].replace(/^[-*]\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: itemText }],
            },
          ],
        });
        i++;
      }
      content.push({ type: "bulletList", content: listItems });
      continue;
    }

    if (line.match(/^\d+\.\s+/)) {
      const listItems: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        const itemText = lines[i].replace(/^\d+\.\s+/, "");
        listItems.push({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: itemText }],
            },
          ],
        });
        i++;
      }
      content.push({ type: "orderedList", content: listItems });
      continue;
    }

    if (line === "---") {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      content.push({
        type: "image",
        attrs: { src: imgMatch[2], alt: imgMatch[1] },
      });
      i++;
      continue;
    }

    const mdxImageMatch = line.match(/^<Image\s+src="([^"]+)"\s+alt="([^"]*)"\s*\/?>/);
    if (mdxImageMatch) {
      content.push({
        type: "image",
        attrs: { src: mdxImageMatch[1], alt: mdxImageMatch[2] },
      });
      i++;
      continue;
    }

    const ctaCardMatch = line.match(/^<CtaCard\s*\/?>/);
    if (ctaCardMatch) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: "<CtaCard/>" }],
      });
      i++;
      continue;
    }

    const calloutStartMatch = line.match(/^<Callout\s+type="([^"]+)">/);
    if (calloutStartMatch) {
      const calloutType = calloutStartMatch[1];
      const calloutLines: string[] = [];
      const restOfLine = line.replace(calloutStartMatch[0], "").trim();
      if (restOfLine && !restOfLine.includes("</Callout>")) {
        calloutLines.push(restOfLine);
      } else if (restOfLine.includes("</Callout>")) {
        const calloutContent = restOfLine.replace("</Callout>", "").trim();
        content.push({
          type: "paragraph",
          content: [{ type: "text", text: `<Callout type="${calloutType}">${calloutContent}</Callout>` }],
        });
        i++;
        continue;
      }
      i++;
      while (i < lines.length && !lines[i].includes("</Callout>")) {
        calloutLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].includes("</Callout>")) {
        const lastLine = lines[i].replace("</Callout>", "").trim();
        if (lastLine) {
          calloutLines.push(lastLine);
        }
      }
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: `<Callout type="${calloutType}">${calloutLines.join("\n")}</Callout>` }],
      });
      i++;
      continue;
    }

    content.push({
      type: "paragraph",
      content: parseInlineContent(line),
    });
    i++;
  }

  return { type: "doc", content };
}

function parseInlineContent(text: string): JSONContent[] {
  const result: JSONContent[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const italicMatch = remaining.match(/\*([^*]+)\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      linkMatch
        ? { type: "link", match: linkMatch, index: linkMatch.index! }
        : null,
      boldMatch
        ? { type: "bold", match: boldMatch, index: boldMatch.index! }
        : null,
      italicMatch
        ? { type: "italic", match: italicMatch, index: italicMatch.index! }
        : null,
      codeMatch
        ? { type: "code", match: codeMatch, index: codeMatch.index! }
        : null,
    ].filter(Boolean) as {
      type: string;
      match: RegExpMatchArray;
      index: number;
    }[];

    if (matches.length === 0) {
      if (remaining) {
        result.push({ type: "text", text: remaining });
      }
      break;
    }

    matches.sort((a, b) => a.index - b.index);
    const first = matches[0];

    if (first.index > 0) {
      result.push({ type: "text", text: remaining.slice(0, first.index) });
    }

    if (first.type === "link") {
      result.push({
        type: "text",
        text: first.match[1],
        marks: [{ type: "link", attrs: { href: first.match[2] } }],
      });
    } else if (first.type === "bold") {
      result.push({
        type: "text",
        text: first.match[1],
        marks: [{ type: "bold" }],
      });
    } else if (first.type === "italic") {
      result.push({
        type: "text",
        text: first.match[1],
        marks: [{ type: "italic" }],
      });
    } else if (first.type === "code") {
      result.push({
        type: "text",
        text: first.match[1],
        marks: [{ type: "code" }],
      });
    }

    remaining = remaining.slice(first.index + first.match[0].length);
  }

  return result.length > 0 ? result : [{ type: "text", text: "" }];
}

function MDXPreview({ content }: { content: string }) {
  const renderContent = () => {
    const lines = content.split("\n\n");
    return lines.map((block, index) => {
      const trimmed = block.trim();

      if (trimmed.startsWith("<CtaCard")) {
        return <CtaCard key={index} />;
      }

      const calloutMatch = trimmed.match(
        /^<Callout\s+type="([^"]+)">([\s\S]*)<\/Callout>$/,
      );
      if (calloutMatch) {
        return (
          <Callout key={index} type={calloutMatch[1] as "note" | "warning" | "info" | "tip" | "danger"}>
            {calloutMatch[2]}
          </Callout>
        );
      }

      const imageMatch = trimmed.match(/^<Image\s+src="([^"]+)"\s+alt="([^"]*)"\s*\/?>$/);
      if (imageMatch) {
        return (
          <Image
            key={index}
            src={imageMatch[1]}
            alt={imageMatch[2]}
            className="rounded-sm border border-neutral-200 my-8"
          />
        );
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        return <HeadingTag key={index}>{text}</HeadingTag>;
      }

      if (trimmed.startsWith("```")) {
        const langMatch = trimmed.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (langMatch) {
          return (
            <pre key={index} className="bg-stone-50 border border-neutral-200 rounded-sm p-4 overflow-x-auto">
              <code>{langMatch[2]}</code>
            </pre>
          );
        }
      }

      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={index} className="border-l-4 border-neutral-300 pl-4 italic">
            {trimmed.slice(2)}
          </blockquote>
        );
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split("\n").map((line) => line.replace(/^[-*]\s+/, ""));
        return (
          <ul key={index} className="list-disc pl-6">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }

      if (trimmed === "---") {
        return <hr key={index} className="my-8 border-neutral-200" />;
      }

      if (trimmed) {
        return <p key={index}>{trimmed}</p>;
      }

      return null;
    });
  };

  return <>{renderContent()}</>;
}

export function BlogEditor({ mode, initialData }: BlogEditorProps) {
  const navigate = useNavigate();
  const editorRef = useRef<{ editor: TiptapEditor | null }>(null);

  const [slug, setSlug] = useState(initialData?.slug || "");
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || "");
  const [displayTitle, setDisplayTitle] = useState(
    initialData?.display_title || "",
  );
  const [metaDescription, setMetaDescription] = useState(
    initialData?.meta_description || "",
  );
  const [author, setAuthor] = useState<(typeof AUTHORS)[number]>(
    (initialData?.author as (typeof AUTHORS)[number]) || "John Jeong",
  );
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | "">(
    (initialData?.category as (typeof CATEGORIES)[number]) || "",
  );
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [featured, setFeatured] = useState(initialData?.featured || false);
  const [sha, setSha] = useState(initialData?.sha);
  const [created] = useState(
    initialData?.created || new Date().toISOString().split("T")[0],
  );

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");

  const initialContent = initialData?.content
    ? markdownToJson(initialData.content)
    : { type: "doc", content: [{ type: "paragraph" }] };

  const saveMutation = useMutation({
    mutationFn: async (published: boolean) => {
      const editor = editorRef.current?.editor;
      if (!editor) throw new Error("Editor not ready");

      const content = jsonToMarkdown(editor.getJSON());

      if (!slug) throw new Error("Slug is required");
      if (!metaTitle) throw new Error("Meta title is required");
      if (!metaDescription) throw new Error("Meta description is required");

      return saveArticle({
        data: {
          slug,
          display_title: displayTitle || undefined,
          meta_title: metaTitle,
          meta_description: metaDescription,
          author,
          created,
          updated: new Date().toISOString().split("T")[0],
          coverImage: coverImage || undefined,
          featured: featured || undefined,
          published,
          category: category || undefined,
          content,
          sha,
        },
      });
    },
    onMutate: () => {
      setSaveStatus("saving");
      setErrorMessage("");
    },
    onSuccess: (result) => {
      if ("error" in result && result.error) {
        setSaveStatus("error");
        setErrorMessage(result.message);
      } else if ("success" in result && result.success) {
        setSaveStatus("saved");
        if ("sha" in result) {
          setSha(result.sha);
        }
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    onError: (error) => {
      setSaveStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save",
      );
    },
  });

  const handleTitleChange = useCallback(
    (value: string) => {
      setMetaTitle(value);
      if (mode === "new" && !slug) {
        setSlug(generateSlug(value));
      }
    },
    [mode, slug],
  );

  const handleImageUpload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!slug) {
        setErrorMessage("Please set a slug before uploading images");
        return null;
      }

      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const result = await uploadBlogImage({
            data: {
              slug,
              fileName: file.name,
              fileType: file.type,
              fileData: base64,
            },
          });

          if ("error" in result && result.error) {
            setErrorMessage(result.message);
            resolve(null);
          } else if ("url" in result) {
            resolve(result.url);
          } else {
            resolve(null);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [slug],
  );

  const fileHandlerConfig = {
    onDrop: async (files: File[], editor: TiptapEditor, position?: number) => {
      for (const file of files) {
        const url = await handleImageUpload(file);
        if (url && position !== undefined) {
          editor
            .chain()
            .insertContentAt(position, {
              type: "image",
              attrs: { src: url },
            })
            .focus()
            .run();
        }
      }
      return true;
    },
    onPaste: async (files: File[], editor: TiptapEditor) => {
      for (const file of files) {
        const url = await handleImageUpload(file);
        if (url) {
          editor
            .chain()
            .focus()
            .insertContent({ type: "image", attrs: { src: url } })
            .run();
        }
      }
      return true;
    },
  };

  const handleTogglePreview = useCallback(() => {
    if (!showPreview) {
      const editor = editorRef.current?.editor;
      if (editor) {
        const markdown = jsonToMarkdown(editor.getJSON());
        setPreviewContent(markdown);
      }
    }
    setShowPreview(!showPreview);
  }, [showPreview]);

  const insertComponent = useCallback(
    (component: "callout" | "ctacard") => {
      const editor = editorRef.current?.editor;
      if (!editor) return;

      let text = "";
      if (component === "callout") {
        text = '<Callout type="note">Your note here</Callout>';
      } else if (component === "ctacard") {
        text = "<CtaCard/>";
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [{ type: "text", text }],
        })
        .run();
    },
    [],
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-neutral-100 bg-stone-50/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/blog"
              className="text-sm text-neutral-600 hover:text-stone-600 transition-colors"
            >
              ← Back to Blog
            </Link>
            <span className="text-neutral-300">|</span>
            <span className="text-sm font-medium text-stone-600">
              {mode === "new" ? "New Article" : `Editing: ${slug}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleTogglePreview}
              className={cn([
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                showPreview
                  ? "bg-stone-600 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
              ])}
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
            {saveStatus === "saving" && (
              <span className="text-sm text-neutral-500">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-sm text-green-600">Saved to GitHub</span>
            )}
            {saveStatus === "error" && (
              <span className="text-sm text-red-600">{errorMessage}</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        <div className="flex-1 min-w-0 border-r border-neutral-100">
          <div className="p-8">
            <div className="max-w-3xl mx-auto">
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Article title..."
                className="w-full text-3xl font-serif text-stone-600 placeholder:text-neutral-300 border-none outline-none mb-6"
              />
              {showPreview ? (
                <div className="prose prose-stone max-w-none">
                  <MDXPreview content={previewContent} />
                </div>
              ) : (
                <div className="prose prose-stone max-w-none">
                  <Editor
                    ref={editorRef}
                    initialContent={initialContent}
                    editable={true}
                    fileHandlerConfig={fileHandlerConfig}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 shrink-0 bg-stone-50/30 p-6">
          <div className="sticky top-4 space-y-6">
            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  )
                }
                placeholder="article-slug"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Display Title (optional)
              </label>
              <input
                type="text"
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                placeholder="Display title for the article"
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief description for SEO..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Author
              </label>
              <select
                value={author}
                onChange={(e) =>
                  setAuthor(e.target.value as (typeof AUTHORS)[number])
                }
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400 bg-white"
              >
                {AUTHORS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Category (optional)
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as (typeof CATEGORIES)[number] | "",
                  )
                }
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400 bg-white"
              >
                <option value="">No category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Cover Image URL (optional)
              </label>
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="/api/images/blog/..."
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="featured"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="rounded border-neutral-300 text-stone-600 focus:ring-stone-500"
              />
              <label htmlFor="featured" className="text-sm text-neutral-600">
                Featured article
              </label>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <label className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                Insert Component
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => insertComponent("callout")}
                  disabled={showPreview}
                  className={cn([
                    "flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                    "border border-neutral-200 text-neutral-700 bg-white",
                    "hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed",
                  ])}
                >
                  Callout
                </button>
                <button
                  onClick={() => insertComponent("ctacard")}
                  disabled={showPreview}
                  className={cn([
                    "flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
                    "border border-neutral-200 text-neutral-700 bg-white",
                    "hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed",
                  ])}
                >
                  CTA Card
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 space-y-3">
              <button
                onClick={() => saveMutation.mutate(false)}
                disabled={saveMutation.isPending}
                className={cn([
                  "w-full h-10 flex items-center justify-center text-sm font-medium transition-all",
                  "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm",
                  "hover:shadow-md hover:scale-[102%] active:scale-[98%]",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                ])}
              >
                Save Draft
              </button>
              <button
                onClick={() => saveMutation.mutate(true)}
                disabled={saveMutation.isPending}
                className={cn([
                  "w-full h-10 flex items-center justify-center text-sm font-medium transition-all",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md",
                  "hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                ])}
              >
                Publish
              </button>
            </div>

            {mode === "edit" && (
              <div className="pt-4 border-t border-neutral-200">
                <Link
                  to="/blog/$slug"
                  params={{ slug }}
                  className="text-sm text-stone-600 hover:text-stone-800 transition-colors"
                >
                  View published article →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
