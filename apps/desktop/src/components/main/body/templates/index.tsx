import { BookText, Globe, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import type { Template, TemplateSection, TemplateStorage } from "@hypr/store";
import { Button } from "@hypr/ui/components/ui/button";
import { Switch } from "@hypr/ui/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { type Tab, useTabs } from "../../../../store/zustand/tabs";
import { StandardTabWrapper } from "../index";
import { ResourceListLayout, useWebResources } from "../resource-list";
import { type TabItem, TabItemBase } from "../shared";
import { TemplateDetailsColumn } from "./details";

export const TabItemTemplate: TabItem<Extract<Tab, { type: "templates" }>> = ({
  tab,
  tabIndex,
  handleCloseThis,
  handleSelectThis,
  handleCloseOthers,
  handleCloseAll,
}) => {
  return (
    <TabItemBase
      icon={<BookTextIcon className="w-4 h-4" />}
      title={"Templates"}
      selected={tab.active}
      tabIndex={tabIndex}
      handleCloseThis={() => handleCloseThis(tab)}
      handleSelectThis={() => handleSelectThis(tab)}
      handleCloseOthers={handleCloseOthers}
      handleCloseAll={handleCloseAll}
    />
  );
};

function BookTextIcon({ className }: { className?: string }) {
  return <BookText className={className} />;
}

export function TabContentTemplate({
  tab,
}: {
  tab: Extract<Tab, { type: "templates" }>;
}) {
  return (
    <StandardTabWrapper>
      <TemplateView tab={tab} />
    </StandardTabWrapper>
  );
}

type WebTemplate = {
  slug: string;
  title: string;
  description: string;
  category: string;
  targets?: string[];
  sections: TemplateSection[];
};

export type UserTemplate = Template & { id: string };

export function useUserTemplates(): UserTemplate[] {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const USER_TEMPLATE_QUERY = "user_templates";

  const queries = main.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(
        USER_TEMPLATE_QUERY,
        "templates",
        ({ select, where }) => {
          select("title");
          select("description");
          select("sections");
          select("created_at");
          select("user_id");
          where("user_id", user_id ?? "");
        },
      ),
    [user_id],
  );

  const templates = main.UI.useResultTable(USER_TEMPLATE_QUERY, queries);

  return useMemo(() => {
    return Object.entries(templates as Record<string, unknown>).map(
      ([id, template]) => normalizeTemplateWithId(id, template),
    );
  }, [templates]);
}

function normalizeTemplatePayload(template: unknown): Template {
  const record = (
    template && typeof template === "object" ? template : {}
  ) as Record<string, unknown>;

  let sections: Array<{ title: string; description: string }> = [];
  if (typeof record.sections === "string") {
    try {
      sections = JSON.parse(record.sections);
    } catch {
      sections = [];
    }
  } else if (Array.isArray(record.sections)) {
    sections = record.sections;
  }

  return {
    user_id: typeof record.user_id === "string" ? record.user_id : "",
    created_at: typeof record.created_at === "string" ? record.created_at : "",
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : "",
    sections,
  };
}

function normalizeTemplateWithId(id: string, template: unknown) {
  return { id, ...normalizeTemplatePayload(template) };
}

function TemplateView({ tab }: { tab: Extract<Tab, { type: "templates" }> }) {
  const updateTabState = useTabs((state) => state.updateTemplatesTabState);
  const { user_id } = main.UI.useValues(main.STORE_ID);

  const userTemplates = useUserTemplates();
  const { data: webTemplates = [], isLoading: isWebLoading } =
    useWebResources<WebTemplate>("templates");

  const { selectedMineId, selectedWebIndex } = tab.state;
  const isWebMode = tab.state.isWebMode ?? userTemplates.length === 0;

  const setIsWebMode = useCallback(
    (value: boolean) => {
      updateTabState(tab, {
        isWebMode: value,
        selectedMineId: null,
        selectedWebIndex: null,
      });
    },
    [updateTabState, tab],
  );

  const setSelectedMineId = useCallback(
    (id: string | null) => {
      updateTabState(tab, {
        ...tab.state,
        selectedMineId: id,
        selectedWebIndex: null,
      });
    },
    [updateTabState, tab],
  );

  const setSelectedWebIndex = useCallback(
    (index: number | null) => {
      updateTabState(tab, {
        ...tab.state,
        selectedMineId: null,
        selectedWebIndex: index,
      });
    },
    [updateTabState, tab],
  );

  const selectedWebTemplate =
    selectedWebIndex !== null ? (webTemplates[selectedWebIndex] ?? null) : null;

  const deleteTemplateFromStore = main.UI.useDelRowCallback(
    "templates",
    (template_id: string) => template_id,
    main.STORE_ID,
  );

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      deleteTemplateFromStore(id);
      setSelectedMineId(null);
    },
    [deleteTemplateFromStore, setSelectedMineId],
  );

  const setRow = main.UI.useSetRowCallback(
    "templates",
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: TemplateSection[];
    }) => p.id,
    (p: {
      id: string;
      user_id: string;
      created_at: string;
      title: string;
      description: string;
      sections: TemplateSection[];
    }) =>
      ({
        user_id: p.user_id,
        created_at: p.created_at,
        title: p.title,
        description: p.description,
        sections: JSON.stringify(p.sections),
      }) satisfies TemplateStorage,
    [],
    main.STORE_ID,
  );

  const handleCloneTemplate = useCallback(
    (template: {
      title: string;
      description: string;
      sections: TemplateSection[];
    }) => {
      if (!user_id) return;

      const newId = crypto.randomUUID();
      const now = new Date().toISOString();

      setRow({
        id: newId,
        user_id,
        created_at: now,
        title: template.title,
        description: template.description,
        sections: template.sections.map((section) => ({ ...section })),
      });

      setIsWebMode(false);
      setSelectedMineId(newId);
    },
    [user_id, setRow, setIsWebMode, setSelectedMineId],
  );

  return (
    <ResourceListLayout
      listColumn={
        <TemplateListColumn
          isWebMode={isWebMode}
          setIsWebMode={setIsWebMode}
          userTemplates={userTemplates}
          webTemplates={webTemplates}
          isWebLoading={isWebLoading}
          selectedMineId={selectedMineId}
          selectedWebIndex={selectedWebIndex}
          setSelectedMineId={setSelectedMineId}
          setSelectedWebIndex={setSelectedWebIndex}
        />
      }
      detailsColumn={
        <TemplateDetailsColumn
          isWebMode={isWebMode}
          selectedMineId={selectedMineId}
          selectedWebTemplate={selectedWebTemplate}
          handleDeleteTemplate={handleDeleteTemplate}
          handleCloneTemplate={handleCloneTemplate}
        />
      }
    />
  );
}

function TemplateListColumn({
  isWebMode,
  setIsWebMode,
  userTemplates,
  webTemplates,
  isWebLoading,
  selectedMineId,
  selectedWebIndex,
  setSelectedMineId,
  setSelectedWebIndex,
}: {
  isWebMode: boolean;
  setIsWebMode: (value: boolean) => void;
  userTemplates: UserTemplate[];
  webTemplates: WebTemplate[];
  isWebLoading: boolean;
  selectedMineId: string | null;
  selectedWebIndex: number | null;
  setSelectedMineId: (id: string | null) => void;
  setSelectedWebIndex: (index: number | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredMine = useMemo(() => {
    if (!search.trim()) return userTemplates;
    const q = search.toLowerCase();
    return userTemplates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [userTemplates, search]);

  const filteredWeb = useMemo(() => {
    if (!search.trim()) return webTemplates;
    const q = search.toLowerCase();
    return webTemplates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q),
    );
  }, [webTemplates, search]);

  const items = isWebMode ? filteredWeb : filteredMine;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="border-b border-neutral-200">
        <div className="py-2 pl-3 pr-1 flex items-center justify-between h-12">
          <h3 className="text-sm font-medium">Templates</h3>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 px-2">
                  <Globe size={14} className="text-neutral-400" />
                  <Switch
                    size="sm"
                    checked={isWebMode}
                    onCheckedChange={setIsWebMode}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isWebMode
                  ? "Showing community templates"
                  : "Showing your templates"}
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={() => {
                if (showSearch) setSearch("");
                setShowSearch(!showSearch);
              }}
              size="icon"
              variant="ghost"
            >
              <Search size={16} />
            </Button>
          </div>
        </div>
        {showSearch && (
          <div className="flex items-center gap-2 px-3 border-t bg-white border-neutral-200 h-12">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearch("");
                  setShowSearch(false);
                }
              }}
              placeholder="Search templates..."
              className="w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-400"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="p-1 rounded hover:bg-neutral-100"
              >
                <X className="h-4 w-4 text-neutral-400" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isWebMode && isWebLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="px-3 py-2 rounded-md animate-pulse">
                <div className="h-4 w-3/4 rounded bg-neutral-200" />
                <div className="h-3 w-1/2 rounded bg-neutral-100 mt-1.5" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <BookText size={32} className="mx-auto mb-2 text-neutral-300" />
            <p className="text-sm">
              {search
                ? "No templates found"
                : isWebMode
                  ? "No community templates"
                  : "No templates yet"}
            </p>
          </div>
        ) : isWebMode ? (
          filteredWeb.map((item, index) => (
            <button
              key={`web-${index}`}
              onClick={() => setSelectedWebIndex(index)}
              className={cn([
                "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100",
                selectedWebIndex === index
                  ? "border-neutral-500 bg-neutral-100"
                  : "border-transparent",
              ])}
            >
              <div className="flex items-center gap-2">
                <BookText className="h-4 w-4 text-neutral-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {item.title || "Untitled"}
                    {item.category && (
                      <span className="text-xs text-stone-400 font-mono ml-1">
                        ({item.category})
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-xs text-neutral-500 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          filteredMine.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedMineId(item.id)}
              className={cn([
                "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100",
                selectedMineId === item.id
                  ? "border-neutral-500 bg-neutral-100"
                  : "border-transparent",
              ])}
            >
              <div className="flex items-center gap-2">
                <BookText className="h-4 w-4 text-neutral-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {item.title?.trim() || "Untitled"}
                  </div>
                  {item.description && (
                    <div className="text-xs text-neutral-500 truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
