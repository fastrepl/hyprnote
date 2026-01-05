import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";

import NoteEditor from "@hypr/tiptap/editor";
import { md2json } from "@hypr/tiptap/shared";

import { type Tab } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { type TabItem, TabItemBase } from "../shared";

export const changelogFiles = import.meta.glob(
  "../../../../../../web/content/changelog/*.mdx",
  { query: "?raw", import: "default" },
);

export function getLatestVersion(): string | null {
  const versions = Object.keys(changelogFiles)
    .map((k) => {
      const match = k.match(/\/([^/]+)\.mdx$/);
      return match ? match[1] : null;
    })
    .filter((v): v is string => v !== null)
    .filter((v) => !v.includes("nightly"))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  return versions[0] || null;
}

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  if (match) {
    return content.slice(match[0].length).trim();
  }
  return content.trim();
}

function stripImageLine(content: string): string {
  return content.replace(/^!\[.*?\]\(.*?\)\s*\n*/m, "");
}

export const TabItemChangelog: TabItem<Extract<Tab, { type: "changelog" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
  handlePinThis,
  handleUnpinThis,
}) => (
  <TabItemBase
    icon={<SparklesIcon className="w-4 h-4" />}
    title="What's New"
    selected={tab.active}
    pinned={tab.pinned}
    tabIndex={tabIndex}
    handleCloseThis={() => handleCloseThis(tab)}
    handleSelectThis={() => handleSelectThis(tab)}
    handleCloseOthers={handleCloseOthers}
    handleCloseAll={handleCloseAll}
    handlePinThis={() => handlePinThis(tab)}
    handleUnpinThis={() => handleUnpinThis(tab)}
  />
);

export function TabContentChangelog({
  tab,
}: {
  tab: Extract<Tab, { type: "changelog" }>;
}) {
  const { previous, current } = tab.state;

  const { content, loading } = useChangelogContent(current);

  return (
    <StandardTabWrapper>
      <div className="flex flex-col h-full">
        <div className="mt-2 px-3 shrink-0">
          <h1 className="text-2xl font-semibold text-neutral-900">
            v{current}
          </h1>
          {previous && (
            <p className="mt-1 text-sm text-neutral-500">from v{previous}</p>
          )}
        </div>

        <div className="mt-2 px-2 flex-1 min-h-0">
          {loading ? (
            <p className="text-neutral-500 px-1">Loading...</p>
          ) : content ? (
            <NoteEditor initialContent={content} editable={false} />
          ) : (
            <p className="text-neutral-500 px-1">
              No changelog available for this version.
            </p>
          )}
        </div>

        <div className="px-3 py-4 border-t border-neutral-200">
          <button
            onClick={() => openUrl("https://hyprnote.com/changelog")}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ExternalLinkIcon className="w-4 h-4" />
            See all changelogs
          </button>
        </div>
      </div>
    </StandardTabWrapper>
  );
}

function useChangelogContent(version: string) {
  const [content, setContent] = useState<ReturnType<typeof md2json> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = Object.keys(changelogFiles).find((k) =>
      k.endsWith(`/${version}.mdx`),
    );

    if (!key) {
      setLoading(false);
      return;
    }

    changelogFiles[key]().then((raw) => {
      const markdown = stripImageLine(stripFrontmatter(raw as string));
      setContent(md2json(markdown));
      setLoading(false);
    });
  }, [version]);

  return { content, loading };
}
