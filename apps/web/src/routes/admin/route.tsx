import { Icon } from "@iconify-icon/react";
import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { Image } from "@/components/image";
import { fetchAdminUser } from "@/functions/admin";

interface FolderTreeItem {
  name: string;
  path: string;
  children?: FolderTreeItem[];
}

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    if (import.meta.env.DEV) {
      return { user: { email: "dev@local", isAdmin: true } };
    }

    const user = await fetchAdminUser();

    if (!user) {
      throw redirect({
        to: "/auth",
        search: {
          flow: "web",
          redirect: "/admin",
        },
      });
    }

    if (!user.isAdmin) {
      throw redirect({
        to: "/",
      });
    }

    return { user };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filters = [
    { id: "all", label: "All" },
    { id: "images", label: "Images" },
    { id: "videos", label: "Videos" },
    { id: "documents", label: "Documents" },
  ];

  const folderTree: FolderTreeItem[] = [
    {
      name: "images",
      path: "",
      children: [
        { name: "blog", path: "blog" },
        { name: "hyprnote", path: "hyprnote" },
        { name: "icons", path: "icons" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AdminHeader user={user} />
      <div className="flex flex-1">
        <AdminSidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          filters={filters}
          folderTree={folderTree}
        />
        <main className="flex-1 border-l border-neutral-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AdminHeader({ user }: { user: { email: string } }) {
  const firstName = user.email.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <header className="h-16 border-b border-neutral-100 bg-white">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/api/images/hyprnote/logo.svg"
              alt="Hyprnote"
              className="h-6"
            />
          </Link>
          <span className="font-serif italic text-stone-600 text-lg">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-sm text-neutral-600">
            Welcome {displayName}!
          </span>
          <Link
            to="/"
            className={cn([
              "text-sm text-neutral-500 hover:text-neutral-700 transition-colors",
              "hover:underline decoration-dotted",
            ])}
          >
            logout
          </Link>
        </div>
      </div>
    </header>
  );
}

function AdminSidebar({
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  filters,
  folderTree,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  filters: { id: string; label: string }[];
  folderTree: FolderTreeItem[];
}) {
  return (
    <aside className="w-64 bg-stone-50/30 border-r border-neutral-100 flex flex-col">
      <div className="p-4 space-y-4">
        <div className="relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className={cn([
              "w-full pl-9 pr-3 py-2 text-sm",
              "border border-neutral-200 rounded-lg",
              "bg-white",
              "focus:outline-none focus:border-stone-400",
              "placeholder:text-neutral-400",
            ])}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn([
                "px-3 py-1 text-xs rounded-full transition-all",
                activeFilter === filter.id
                  ? "bg-stone-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              ])}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-neutral-100" />

      <div className="flex-1 overflow-y-auto p-4">
        <FolderTree items={folderTree} />
      </div>
    </aside>
  );
}

function FolderTree({
  items,
  depth = 0,
}: {
  items: FolderTreeItem[];
  depth?: number;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["images"]),
  );

  const toggleFolder = (name: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedFolders.has(item.name);

        return (
          <div key={item.name}>
            <div
              className={cn([
                "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
                "text-sm text-neutral-700 hover:bg-neutral-100",
                "transition-colors",
              ])}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => hasChildren && toggleFolder(item.name)}
            >
              {hasChildren ? (
                <Icon
                  icon={isExpanded ? "mdi:chevron-down" : "mdi:chevron-right"}
                  className="text-neutral-400 text-sm"
                />
              ) : (
                <span className="w-4" />
              )}
              <Icon
                icon={
                  hasChildren
                    ? isExpanded
                      ? "mdi:folder-open-outline"
                      : "mdi:folder-outline"
                    : "mdi:folder-outline"
                }
                className="text-stone-500"
              />
              <span>{item.name}</span>
            </div>
            {hasChildren && isExpanded && (
              <FolderTree items={item.children!} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}
