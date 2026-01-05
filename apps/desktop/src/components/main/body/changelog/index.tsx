import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLinkIcon, SparklesIcon } from "lucide-react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useResizeObserver } from "usehooks-ts";

import NoteEditor from "@hypr/tiptap/editor";
import { md2json } from "@hypr/tiptap/shared";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@hypr/ui/components/ui/breadcrumb";
import { Button } from "@hypr/ui/components/ui/button";
import { cn } from "@hypr/utils";

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
  return content.trim();
}

function stripImageLine(content: string): string {
  return content.replace(/^!\[.*?\]\(.*?\)\s*\n*/m, "");
}

function addSpacingBeforeHeaders(content: string): string {
  return content.replace(/\n(#{1,6}\s)/g, "\n\n$1");
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
  const { scrollRef, atStart, atEnd } = useScrollFade<HTMLDivElement>();

  return (
    <StandardTabWrapper>
      <div className="flex flex-col h-full">
        <div className="pl-2 pr-1 shrink-0">
          <ChangelogHeader version={current} />
        </div>

        <div className="mt-2 px-3 shrink-0">
          <h1 className="text-2xl font-semibold text-neutral-900">
            v{current}
          </h1>
          {previous && (
            <p className="mt-1 text-sm text-neutral-500">from v{previous}</p>
          )}
        </div>

        <div className="mt-2 px-2 flex-1 min-h-0 relative">
          {!atStart && <ScrollFadeOverlay position="top" />}
          {!atEnd && <ScrollFadeOverlay position="bottom" />}
          <div ref={scrollRef} className="h-full overflow-y-auto">
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
        </div>
      </div>
    </StandardTabWrapper>
  );
}

function ChangelogHeader({ version }: { version: string }) {
  return (
    <div className="w-full pt-1">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Breadcrumb className="ml-1.5 min-w-0">
            <BreadcrumbList className="text-neutral-700 text-xs flex-nowrap overflow-hidden gap-0.5">
              <BreadcrumbItem className="shrink-0">
                <span className="text-neutral-500">Changelog</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="shrink-0" />
              <BreadcrumbItem className="overflow-hidden">
                <BreadcrumbPage className="truncate">{version}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={() => openUrl("https://hyprnote.com/changelog")}
          >
            <ExternalLinkIcon className="size-4" />
            <span>See all</span>
          </Button>
        </div>
      </div>
    </div>
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
      const stripped = stripImageLine(stripFrontmatter(raw as string));
      const markdown = addSpacingBeforeHeaders(stripped);
      setContent(md2json(markdown));
      setLoading(false);
    });
  }, [version]);

  return { content, loading };
}

function useScrollFade<T extends HTMLElement>() {
  const scrollRef = useRef<T>(null);
  const [state, setState] = useState({ atStart: true, atEnd: true });

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setState({
      atStart: scrollTop <= 1,
      atEnd: scrollTop + clientHeight >= scrollHeight - 1,
    });
  }, []);

  useResizeObserver({ ref: scrollRef as RefObject<T>, onResize: update });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    update();
    el.addEventListener("scroll", update);
    return () => el.removeEventListener("scroll", update);
  }, [update]);

  return { scrollRef, ...state };
}

function ScrollFadeOverlay({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={cn([
        "absolute left-0 w-full h-8 z-20 pointer-events-none",
        position === "top" &&
          "top-0 bg-gradient-to-b from-white to-transparent",
        position === "bottom" &&
          "bottom-0 bg-gradient-to-t from-white to-transparent",
      ])}
    />
  );
}
