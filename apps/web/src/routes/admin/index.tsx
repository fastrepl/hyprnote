import { Icon } from "@iconify-icon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import yaml from "js-yaml";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownLeft,
  EyeIcon,
  EyeOffIcon,
  FolderOpenIcon,
  Loader2,
  SparklesIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Dialog, DialogContent } from "@hypr/ui/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";
import { cn } from "@hypr/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminIndexPage,
});

interface ImportResult {
  success: boolean;
  mdx?: string;
  frontmatter?: {
    meta_title: string;
    display_title: string;
    meta_description: string;
    author: string;
    coverImage: string;
    featured: boolean;
    date: string;
  };
  error?: string;
}

interface SaveResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

interface MediaItem {
  name: string;
  path: string;
  publicPath: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  downloadUrl: string | null;
}

interface TreeNode {
  path: string;
  name: string;
  type: "file" | "dir";
  expanded: boolean;
  loaded: boolean;
  children: TreeNode[];
}

async function fetchMediaItems(path: string): Promise<MediaItem[]> {
  const response = await fetch(
    `/api/admin/media/list?path=${encodeURIComponent(path)}`,
  );
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch media");
  }
  return data.items;
}

async function uploadFile(params: {
  filename: string;
  content: string;
  folder: string;
}) {
  const response = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Upload failed");
  }
  return response.json();
}

function getRelativePath(fullPath: string): string {
  return fullPath.replace(/^apps\/web\/public\/images\/?/, "");
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const AUTHORS = [
  { name: "Harshika", avatar: "/api/images/team/harshika.jpeg" },
  { name: "John Jeong", avatar: "/api/images/team/john.png" },
  { name: "Yujong Lee", avatar: "/api/images/team/yujong.png" },
];

const CATEGORIES = [
  "Case Study",
  "Products In-depth",
  "Hyprnote Weekly",
  "Productivity Hack",
  "Engineering",
] as const;

const remarkPlugins = [remarkGfm];

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const MarkdownPreview = memo(function MarkdownPreview({
  mdxContent,
}: {
  mdxContent: string;
}) {
  const debouncedContent = useDebouncedValue(mdxContent, 300);

  if (!debouncedContent) {
    return (
      <p className="text-neutral-400 text-center">Preview will appear here</p>
    );
  }
  return (
    <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h1:text-3xl prose-h1:mt-12 prose-h1:mb-6 prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 prose-pre:bg-stone-50 prose-pre:border prose-pre:border-neutral-200 prose-pre:rounded-sm prose-img:rounded-sm prose-img:border prose-img:border-neutral-200 prose-img:my-8 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-neutral-200 prose-th:bg-neutral-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium prose-td:border prose-td:border-neutral-200 prose-td:px-3 prose-td:py-2 max-w-none">
      <Markdown remarkPlugins={remarkPlugins}>{debouncedContent}</Markdown>
    </article>
  );
});

function PreviewPanel({
  displayTitle,
  metaTitle,
  author,
  avatarUrl,
  date,
  mdxContent,
}: {
  displayTitle: string;
  metaTitle: string;
  author: string;
  avatarUrl?: string;
  date: string;
  mdxContent: string;
}) {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <header className="py-12 text-center max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-serif text-stone-600 mb-6">
          {displayTitle || metaTitle || "Untitled"}
        </h1>
        {author && (
          <div className="flex items-center justify-center gap-3 mb-2">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={author}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <p className="text-base text-neutral-600">{author}</p>
          </div>
        )}
        {date && (
          <time className="text-xs font-mono text-neutral-500">
            {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}
      </header>
      <div className="max-w-3xl mx-auto px-6 pb-8">
        <MarkdownPreview mdxContent={mdxContent} />
      </div>
    </div>
  );
}

const AuthorSelect = memo(function AuthorSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedAuthor = AUTHORS.find((a) => a.name === value);

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-2 py-2 text-left text-neutral-900 cursor-pointer"
      >
        {selectedAuthor ? (
          <>
            <img
              src={selectedAuthor.avatar}
              alt={selectedAuthor.name}
              className="size-5 rounded-full object-cover"
            />
            {selectedAuthor.name}
          </>
        ) : (
          <span className="text-neutral-400">Select author</span>
        )}
        <ChevronRightIcon
          className={cn([
            "size-3 ml-auto transition-transform text-neutral-400",
            isOpen && "rotate-90",
          ])}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-neutral-200 rounded-sm shadow-lg z-50">
          {AUTHORS.map((author) => (
            <button
              key={author.name}
              type="button"
              onClick={() => {
                onChange(author.name);
                setIsOpen(false);
              }}
              className={cn([
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer",
                "hover:bg-neutral-100 transition-colors",
                value === author.name && "bg-neutral-50",
              ])}
            >
              <img
                src={author.avatar}
                alt={author.name}
                className="size-5 rounded-full object-cover"
              />
              {author.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

function MediaSelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectionMode = "single",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  selectionMode?: "single" | "multi";
}) {
  const queryClient = useQueryClient();
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [rootExpanded, setRootExpanded] = useState(true);
  const [rootLoaded, setRootLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rootQuery = useQuery({
    queryKey: ["mediaItems", ""],
    queryFn: () => fetchMediaItems(""),
    enabled: open,
  });

  const folderQuery = useQuery({
    queryKey: ["mediaItems", selectedPath],
    queryFn: () => fetchMediaItems(selectedPath),
    enabled: open && selectedPath !== "",
  });

  useEffect(() => {
    if (rootQuery.data && !rootLoaded) {
      const children: TreeNode[] = rootQuery.data.map((item) => ({
        path: getRelativePath(item.path),
        name: item.name,
        type: item.type,
        expanded: false,
        loaded: false,
        children: [],
      }));
      setTreeNodes(children);
      setRootLoaded(true);
    }
  }, [rootQuery.data, rootLoaded]);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setSelectedFiles(new Set());
    }
  }, [open]);

  const loadFolderContents = async (path: string) => {
    setLoadingPath(path);
    try {
      const items = await fetchMediaItems(path);
      const children: TreeNode[] = items.map((item) => ({
        path: getRelativePath(item.path),
        name: item.name,
        type: item.type,
        expanded: false,
        loaded: false,
        children: [],
      }));

      if (path === "") {
        setTreeNodes(children);
        setRootLoaded(true);
      } else {
        setTreeNodes((prev) => updateTreeNode(prev, path, children));
      }
    } finally {
      setLoadingPath(null);
    }
  };

  const updateTreeNode = (
    nodes: TreeNode[],
    targetPath: string,
    children: TreeNode[],
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children, loaded: true };
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateTreeNode(node.children, targetPath, children),
        };
      }
      return node;
    });
  };

  const toggleNodeExpanded = async (path: string) => {
    if (path === "") {
      const willExpand = !rootExpanded;
      if (willExpand && !rootLoaded) {
        await loadFolderContents("");
      }
      setRootExpanded(willExpand);
      return;
    }

    const node = findNode(treeNodes, path);
    if (!node) return;

    const willExpand = !node.expanded;
    if (willExpand && !node.loaded && node.type === "dir") {
      await loadFolderContents(path);
    }
    setTreeNodes((prev) => toggleExpanded(prev, path));
  };

  const findNode = (nodes: TreeNode[], path: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children.length > 0) {
        const found = findNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const toggleExpanded = (nodes: TreeNode[], path: string): TreeNode[] => {
    return nodes.map((node) => {
      if (node.path === path) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children.length > 0) {
        return { ...node, children: toggleExpanded(node.children, path) };
      }
      return node;
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadFile({
          filename: file.name,
          content,
          folder: selectedPath,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mediaItems"] });
      loadFolderContents(selectedPath);
    },
  });

  const handleUpload = (files: FileList) => {
    uploadMutation.mutate(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (publicPath: string) => {
    if (selectionMode === "single") {
      setSelectedFile(selectedFile === publicPath ? null : publicPath);
    } else {
      const newSelection = new Set(selectedFiles);
      if (newSelection.has(publicPath)) {
        newSelection.delete(publicPath);
      } else {
        newSelection.add(publicPath);
      }
      setSelectedFiles(newSelection);
    }
  };

  const handleConfirm = () => {
    if (selectionMode === "single" && selectedFile) {
      onSelect(selectedFile);
      onOpenChange(false);
    } else if (selectionMode === "multi" && selectedFiles.size > 0) {
      onSelect(Array.from(selectedFiles).join(","));
      onOpenChange(false);
    }
  };

  const selectFolder = (path: string) => {
    setSelectedPath(path);
  };

  const currentItems = selectedPath === "" ? rootQuery.data : folderQuery.data;
  const items = (currentItems || [])
    .filter((item) => item.type === "file")
    .map((item) => ({
      ...item,
      relativePath: getRelativePath(item.path),
    }));

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isLoading =
    selectedPath === "" ? rootQuery.isLoading : folderQuery.isLoading;

  const selectionCount =
    selectionMode === "single" ? (selectedFile ? 1 : 0) : selectedFiles.size;

  const breadcrumbs = selectedPath ? selectedPath.split("/") : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
          <div className="h-10 px-3 flex items-center border-b border-neutral-200">
            <div className="relative w-full flex items-center gap-1.5">
              <Icon
                icon="mdi:magnify"
                className="text-neutral-400 text-sm shrink-0"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full py-1 text-sm bg-transparent focus:outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Root folder */}
            <div
              className={cn([
                "flex items-center gap-1.5 py-1 pl-3 pr-2 cursor-pointer text-sm",
                "hover:bg-neutral-100 transition-colors",
                selectedPath === "" && "bg-neutral-100",
              ])}
              onClick={async () => {
                selectFolder("");
                await toggleNodeExpanded("");
              }}
            >
              {loadingPath === "" ? (
                <Icon
                  icon="mdi:loading"
                  className="text-neutral-400 text-sm animate-spin"
                />
              ) : (
                <Icon
                  icon={rootExpanded ? "mdi:folder-open" : "mdi:folder"}
                  className="text-neutral-400 text-sm"
                />
              )}
              <span className="text-neutral-700">images</span>
            </div>
            {rootExpanded &&
              treeNodes.map((node) => (
                <SidebarTreeNode
                  key={node.path}
                  node={node}
                  depth={1}
                  selectedPath={selectedPath}
                  loadingPath={loadingPath}
                  onSelect={selectFolder}
                  onToggle={toggleNodeExpanded}
                />
              ))}
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-10 border-b border-neutral-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-1 text-sm text-neutral-600">
              <button
                onClick={() => selectFolder("")}
                className="hover:text-neutral-900"
              >
                images
              </button>
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-neutral-400">/</span>
                  <button
                    onClick={() =>
                      selectFolder(breadcrumbs.slice(0, i + 1).join("/"))
                    }
                    className="hover:text-neutral-900"
                  >
                    {crumb}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Body */}
          <div
            className={cn([
              "flex-1 overflow-y-auto p-4",
              dragOver && "bg-blue-50",
            ])}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-neutral-500">
                <Icon
                  icon="mdi:loading"
                  className="animate-spin text-2xl mr-2"
                />
                Loading...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <Icon
                  icon="mdi:folder-open-outline"
                  className="text-4xl mb-3"
                />
                <p className="text-sm">No files found</p>
                <p className="text-xs mt-1">
                  Drag and drop files here or click Upload
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {filteredItems.map((item) => {
                  const isSelected =
                    selectionMode === "single"
                      ? selectedFile === item.publicPath
                      : selectedFiles.has(item.publicPath);
                  return (
                    <div
                      key={item.path}
                      className={cn([
                        "group relative rounded border overflow-hidden cursor-pointer transition-all",
                        isSelected
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-neutral-200 hover:border-neutral-300",
                      ])}
                      onClick={() => handleFileSelect(item.publicPath)}
                    >
                      <div className="aspect-square bg-neutral-100 flex items-center justify-center overflow-hidden">
                        {item.downloadUrl ? (
                          <img
                            src={item.downloadUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Icon
                            icon="mdi:file-outline"
                            className="text-3xl text-neutral-400"
                          />
                        )}
                      </div>
                      <div className="p-1.5">
                        <p
                          className="text-xs text-neutral-700 truncate"
                          title={item.name}
                        >
                          {item.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatFileSize(item.size)}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1 left-1">
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Icon
                              icon="mdi:check"
                              className="text-white text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="h-14 border-t border-neutral-200 flex items-center justify-between px-4">
            {selectionCount > 0 ? (
              <>
                <span className="text-sm text-neutral-600">
                  {selectionCount} selected
                </span>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Confirm
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload"}
                </button>
                <button
                  disabled
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded opacity-50 cursor-not-allowed"
                >
                  Confirm
                </button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SidebarTreeNode({
  node,
  depth,
  selectedPath,
  loadingPath,
  onSelect,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string;
  loadingPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => Promise<void>;
}) {
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === "dir";
  const isLoading = loadingPath === node.path;

  if (!isFolder) return null;

  return (
    <div>
      <div
        className={cn([
          "flex items-center gap-1.5 py-1 pr-2 cursor-pointer text-sm",
          "hover:bg-neutral-100 transition-colors",
          isSelected && "bg-neutral-100",
        ])}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={async () => {
          onSelect(node.path);
          await onToggle(node.path);
        }}
      >
        {isLoading ? (
          <Icon
            icon="mdi:loading"
            className="text-neutral-400 text-sm animate-spin"
          />
        ) : (
          <Icon
            icon={node.expanded ? "mdi:folder-open" : "mdi:folder"}
            className="text-neutral-400 text-sm"
          />
        )}
        <span className="truncate text-neutral-700">{node.name}</span>
      </div>
      {node.expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <SidebarTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              loadingPath={loadingPath}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function stripFrontmatter(mdx: string): string {
  const frontmatterMatch = mdx.match(/^---\n[\s\S]*?\n---\n*/);
  if (frontmatterMatch) {
    return mdx.slice(frontmatterMatch[0].length);
  }
  return mdx;
}

function buildFrontmatter(metadata: {
  meta_title: string;
  display_title: string;
  meta_description: string;
  author: string;
  date: string;
  coverImage: string;
  category: string;
  featured: boolean;
}): string {
  const obj: Record<string, unknown> = {};

  if (metadata.meta_title) obj.meta_title = metadata.meta_title;
  if (metadata.display_title) obj.display_title = metadata.display_title;
  if (metadata.meta_description)
    obj.meta_description = metadata.meta_description;
  if (metadata.author) obj.author = metadata.author;
  if (metadata.date) obj.date = metadata.date;
  if (metadata.coverImage) obj.coverImage = metadata.coverImage;
  if (metadata.category) obj.category = metadata.category;
  obj.featured = metadata.featured;
  obj.published = true;

  return `---\n${yaml.dump(obj)}---`;
}

function MetadataRow({
  label,
  required,
  noBorder,
  showValidation,
  isInvalid,
  children,
}: {
  label: string;
  required?: boolean;
  noBorder?: boolean;
  showValidation?: boolean;
  isInvalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn([
        "flex transition-colors",
        !noBorder && "border-b border-neutral-200",
        showValidation && isInvalid && "bg-red-50",
      ])}
    >
      <span className="w-28 shrink-0 pl-6 pr-4 py-2 text-neutral-500 flex items-center relative">
        {required && <span className="absolute left-3 text-red-400">*</span>}
        {label}
      </span>
      {children}
    </div>
  );
}

const MetadataPanel = memo(function MetadataPanel({
  isExpanded,
  onToggleExpanded,
  metaTitle,
  setMetaTitle,
  displayTitle,
  setDisplayTitle,
  metaDescription,
  setMetaDescription,
  author,
  setAuthor,
  date,
  setDate,
  coverImage,
  setCoverImage,
  category,
  setCategory,
  slug,
  setSlug,
  featured,
  setFeatured,
  generateSlugFromTitle,
  showValidation,
  onOpenMediaModal,
}: {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  metaTitle: string;
  setMetaTitle: (v: string) => void;
  displayTitle: string;
  setDisplayTitle: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  author: string;
  setAuthor: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  coverImage: string;
  setCoverImage: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  featured: boolean;
  setFeatured: (v: boolean) => void;
  generateSlugFromTitle: () => void;
  showValidation: boolean;
  onOpenMediaModal: () => void;
}) {
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  return (
    <div
      className={cn([
        "shrink-0 relative",
        isExpanded && "border-b border-neutral-200",
      ])}
    >
      <div
        className={cn([
          "text-sm transition-all duration-200 overflow-hidden",
          isExpanded ? "max-h-125" : "max-h-0",
        ])}
      >
        <div
          className={cn([
            "flex border-b border-neutral-200 transition-colors",
            showValidation && !metaTitle && "bg-red-50",
          ])}
        >
          <button
            onClick={() => setIsTitleExpanded(!isTitleExpanded)}
            className="w-28 shrink-0 pl-6 pr-4 py-2 text-neutral-500 flex items-center justify-between hover:text-neutral-700 relative"
          >
            <span className="absolute left-3 text-red-400">*</span>
            Title
            <ChevronRightIcon
              className={cn([
                "size-4 transition-transform",
                isTitleExpanded && "rotate-90",
              ])}
            />
          </button>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="SEO meta title"
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
          />
        </div>
        {isTitleExpanded && (
          <div className="flex border-b border-neutral-200 bg-neutral-50">
            <span className="w-24 shrink-0 pl-6 pr-4 py-2 text-neutral-400 flex items-center gap-1 relative">
              <span className="text-neutral-300">└</span>
              Display
            </span>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => setDisplayTitle(e.target.value)}
              placeholder={metaTitle || "Display title (optional)"}
              className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
          </div>
        )}
        <MetadataRow
          label="Slug"
          required
          showValidation={showValidation}
          isInvalid={!slug}
        >
          <div className="flex-1 flex items-center">
            <span className="text-neutral-400 text-xs">hyprnote.com/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="article-slug"
              className="flex-1 px-1 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
            <button
              type="button"
              onClick={generateSlugFromTitle}
              className="p-1.5 text-neutral-400 hover:text-neutral-600"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </MetadataRow>
        <MetadataRow
          label="Description"
          required
          showValidation={showValidation}
          isInvalid={!metaDescription}
        >
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
              }
            }}
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Meta description for SEO"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
            }}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300 resize-none"
          />
        </MetadataRow>
        <MetadataRow label="Author" required>
          <AuthorSelect value={author} onChange={setAuthor} />
        </MetadataRow>
        <MetadataRow label="Date" required>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900"
          />
        </MetadataRow>
        <MetadataRow label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900"
          >
            <option value="">Select category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </MetadataRow>
        <MetadataRow label="Cover">
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="/api/images/blog/..."
              className="flex-1 px-2 py-2 bg-transparent outline-none text-neutral-900 placeholder:text-neutral-300"
            />
            <button
              type="button"
              onClick={onOpenMediaModal}
              className="p-1.5 text-neutral-400 hover:text-neutral-600"
            >
              <FolderOpenIcon className="w-4 h-4" />
            </button>
          </div>
        </MetadataRow>
        <MetadataRow label="Featured" noBorder>
          <div className="flex-1 flex items-center px-2 py-2">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="rounded"
            />
          </div>
        </MetadataRow>
      </div>
      <button
        onClick={onToggleExpanded}
        className={cn([
          "absolute left-1/2 -translate-x-1/2 top-full z-10",
          "flex items-center justify-center",
          "w-10 h-4 bg-white border border-t-0 border-neutral-200 rounded-b-md",
          "text-neutral-400 hover:text-neutral-600",
          "transition-colors cursor-pointer",
        ])}
      >
        <ChevronDownIcon
          className={cn([
            "size-3 transition-transform duration-200",
            isExpanded && "rotate-180",
          ])}
        />
      </button>
    </div>
  );
});

function AdminIndexPage() {
  const [url, setUrl] = useState("");
  const [mdxContent, setMdxContent] = useState("");

  const [metaTitle, setMetaTitle] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [author, setAuthor] = useState<string>(AUTHORS[0].name);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [coverImage, setCoverImage] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [featured, setFeatured] = useState(false);
  const [slug, setSlug] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(true);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(true);
  const [showValidation, setShowValidation] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);

  const parseMutation = useMutation({
    mutationFn: async (docUrl: string): Promise<ImportResult> => {
      const response = await fetch("/api/admin/import/google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: docUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse document");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.mdx) {
        setMdxContent(stripFrontmatter(data.mdx));
      }
      if (data.frontmatter) {
        if (data.frontmatter.meta_title) {
          setMetaTitle(data.frontmatter.meta_title);
          setDisplayTitle(data.frontmatter.meta_title);
        }
        if (data.frontmatter.meta_description)
          setMetaDescription(data.frontmatter.meta_description);
        if (data.frontmatter.author) setAuthor(data.frontmatter.author);
        if (data.frontmatter.date) setDate(data.frontmatter.date);
        if (data.frontmatter.coverImage)
          setCoverImage(data.frontmatter.coverImage);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (): Promise<SaveResult> => {
      const frontmatter = buildFrontmatter({
        meta_title: metaTitle,
        display_title: displayTitle,
        meta_description: metaDescription,
        author,
        date,
        coverImage,
        category,
        featured,
      });
      const fullContent = `${frontmatter}\n\n${mdxContent}`;
      const filename = slug.endsWith(".mdx") ? slug : `${slug}.mdx`;

      const response = await fetch("/api/admin/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fullContent,
          filename,
          folder: "articles",
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save");
      }
      return response.json();
    },
  });

  const { reset: resetSaveMutation, mutate: mutateSave } = saveMutation;
  const { mutate: mutateParse } = parseMutation;

  const handleParse = useCallback(() => {
    if (!url) return;
    resetSaveMutation();
    mutateParse(url);
  }, [url, resetSaveMutation, mutateParse]);

  const handleSave = useCallback(() => {
    if (!mdxContent || !slug || !metaTitle || !metaDescription) return;
    mutateSave();
  }, [mdxContent, slug, metaTitle, metaDescription, mutateSave]);

  const generateSlugFromTitle = useCallback(() => {
    if (metaTitle) {
      const generated = metaTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
  }, [metaTitle]);

  const error = parseMutation.error || saveMutation.error;

  const handleContentChange = useCallback((newContent: string) => {
    setMdxContent(newContent);
  }, []);

  const selectedAuthor = AUTHORS.find((a) => a.name === author);
  const avatarUrl = selectedAuthor?.avatar;

  const headerInput = (
    <div className="h-12 border-b border-neutral-200 px-6 flex items-center gap-2 bg-neutral-50">
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 47 65" fill="none">
        <path
          d="M29.375,0 L4.40625,0 C1.9828125,0 0,1.99431818 0,4.43181818 L0,60.5681818 C0,63.0056818 1.9828125,65 4.40625,65 L42.59375,65 C45.0171875,65 47,63.0056818 47,60.5681818 L47,17.7272727 L29.375,0 Z"
          fill="#4285F4"
        />
        <path
          d="M33.78125,17.7272727 C31.3467969,17.7272727 29.375,15.7440341 29.375,13.2954545 L29.375,0 L33.78125,0 C36.2157031,0 38.1875,1.98323864 38.1875,4.43181818 L38.1875,17.7272727 L47,17.7272727 L33.78125,17.7272727 Z"
          fill="#A1C2FA"
        />
        <path
          d="M11.75,47.2727273 L35.25,47.2727273 L35.25,44.3181818 L11.75,44.3181818 L11.75,47.2727273 Z M11.75,53.1818182 L29.375,53.1818182 L29.375,50.2272727 L11.75,50.2272727 L11.75,53.1818182 Z M11.75,32.5 L11.75,35.4545455 L35.25,35.4545455 L35.25,32.5 L11.75,32.5 Z M11.75,41.3636364 L35.25,41.3636364 L35.25,38.4090909 L11.75,38.4090909 L11.75,41.3636364 Z"
          fill="#F1F1F1"
        />
      </svg>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleParse()}
        placeholder="https://docs.google.com/document/d/..."
        className="flex-1 text-sm bg-transparent focus:outline-none"
      />
      <button
        onClick={handleParse}
        disabled={parseMutation.isPending || !url}
        className={cn([
          "p-1.5 disabled:opacity-30",
          url ? "text-blue-600 hover:text-blue-700" : "text-neutral-400",
        ])}
      >
        {parseMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CornerDownLeft className="w-4 h-4" />
        )}
      </button>
      {parseMutation.isSuccess && (
        <>
          <div className="w-px h-5 bg-neutral-300" />
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={cn([
              "p-1.5",
              isPreviewMode
                ? "text-blue-600 hover:text-blue-700"
                : "text-neutral-500 hover:text-neutral-700",
            ])}
          >
            {isPreviewMode ? (
              <EyeIcon className="w-4 h-4" />
            ) : (
              <EyeOffIcon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSave}
            onMouseEnter={() => {
              if (!mdxContent || !slug || !metaTitle || !metaDescription) {
                setShowValidation(true);
                if (!isMetadataExpanded) {
                  setIsMetadataExpanded(true);
                }
              }
            }}
            onMouseLeave={() => setShowValidation(false)}
            disabled={
              saveMutation.isPending ||
              !mdxContent ||
              !slug ||
              !metaTitle ||
              !metaDescription
            }
            className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Publishing..." : "Publish"}
          </button>
        </>
      )}
    </div>
  );

  if (!parseMutation.isSuccess) {
    return (
      <div className="h-full flex flex-col">
        {headerInput}
        <div className="flex-1 flex items-center justify-center">
          {parseMutation.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-neutral-600">Parsing Google Doc...</p>
            </div>
          ) : (
            <div className="w-full max-w-xl px-6 text-center">
              <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
                Import from Google Docs
              </h1>
              <p className="text-sm text-neutral-600">
                Paste a public Google Docs link to convert it to MDX
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error instanceof Error ? error.message : "An error occurred"}
                  <button
                    onClick={() => parseMutation.reset()}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {headerInput}

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error instanceof Error ? error.message : "An error occurred"}
          <button
            onClick={() => saveMutation.reset()}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveMutation.isSuccess && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <span className="font-medium">Saved!</span>{" "}
          <code className="bg-green-100 px-1 rounded">
            {saveMutation.data?.path}
          </code>
          {saveMutation.data?.url && (
            <a
              href={saveMutation.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-green-600 hover:text-green-800 underline"
            >
              View on GitHub
            </a>
          )}
        </div>
      )}

      {isPreviewMode ? (
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full">
              <MetadataPanel
                isExpanded={isMetadataExpanded}
                onToggleExpanded={() =>
                  setIsMetadataExpanded(!isMetadataExpanded)
                }
                metaTitle={metaTitle}
                setMetaTitle={setMetaTitle}
                displayTitle={displayTitle}
                setDisplayTitle={setDisplayTitle}
                metaDescription={metaDescription}
                setMetaDescription={setMetaDescription}
                author={author}
                setAuthor={setAuthor}
                date={date}
                setDate={setDate}
                coverImage={coverImage}
                setCoverImage={setCoverImage}
                category={category}
                setCategory={setCategory}
                slug={slug}
                setSlug={setSlug}
                featured={featured}
                setFeatured={setFeatured}
                generateSlugFromTitle={generateSlugFromTitle}
                showValidation={showValidation}
                onOpenMediaModal={() => setMediaModalOpen(true)}
              />
              <div className="flex-1 min-h-0 overflow-y-auto pt-4">
                <textarea
                  value={mdxContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full px-6 resize-none focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="w-px bg-neutral-200" />
          <ResizablePanel defaultSize={50} minSize={30}>
            <PreviewPanel
              displayTitle={displayTitle}
              metaTitle={metaTitle}
              author={author}
              avatarUrl={avatarUrl}
              date={date}
              mdxContent={mdxContent}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <MetadataPanel
            isExpanded={isMetadataExpanded}
            onToggleExpanded={() => setIsMetadataExpanded(!isMetadataExpanded)}
            metaTitle={metaTitle}
            setMetaTitle={setMetaTitle}
            displayTitle={displayTitle}
            setDisplayTitle={setDisplayTitle}
            metaDescription={metaDescription}
            setMetaDescription={setMetaDescription}
            author={author}
            setAuthor={setAuthor}
            date={date}
            setDate={setDate}
            coverImage={coverImage}
            setCoverImage={setCoverImage}
            category={category}
            setCategory={setCategory}
            slug={slug}
            setSlug={setSlug}
            featured={featured}
            setFeatured={setFeatured}
            generateSlugFromTitle={generateSlugFromTitle}
            showValidation={showValidation}
            onOpenMediaModal={() => setMediaModalOpen(true)}
          />
          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <textarea
              value={mdxContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full px-6 resize-none focus:outline-none font-mono text-sm"
            />
          </div>
        </div>
      )}

      <MediaSelectorModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        onSelect={setCoverImage}
        selectionMode="single"
      />
    </div>
  );
}
