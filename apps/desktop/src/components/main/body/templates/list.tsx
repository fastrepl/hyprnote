import { useQuery } from "@tanstack/react-query";
import { BookText } from "lucide-react";
import { useMemo, useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import type { Template } from "@hypr/store";
import { cn } from "@hypr/utils";

import * as main from "../../../../store/tinybase/main";
import { TemplateColumnHeader } from "./shared";

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
  return {
    id,
    ...normalizeTemplatePayload(template),
  };
}

function useUserTemplates(): Array<Template & { id: string }> {
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

function useSuggestedTemplates() {
  return useQuery({
    queryKey: ["settings", "templates", "suggestions"],
    queryFn: async () => {
      const response = await fetch("https://hyprnote.com/api/templates", {
        headers: { Accept: "application/json" },
      });
      const data: Template[] = await response.json();
      return data;
    },
  });
}

export function TemplatesListColumn({
  selectedTemplate,
  setSelectedTemplate,
  onCloneTemplate,
}: {
  selectedTemplate: string | null;
  setSelectedTemplate: (id: string | null) => void;
  onCloneTemplate: (template: {
    title: string;
    description: string;
    sections: Array<{ title: string; description: string }>;
  }) => void;
}) {
  const [searchValue, setSearchValue] = useState("");
  const userTemplates = useUserTemplates();
  const { data: suggestedTemplates = [] } = useSuggestedTemplates();

  const filteredUserTemplates = useMemo(() => {
    if (!searchValue.trim()) {
      return userTemplates;
    }
    const q = searchValue.toLowerCase();
    return userTemplates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    );
  }, [userTemplates, searchValue]);

  const filteredSuggestedTemplates = useMemo(() => {
    if (!searchValue.trim()) {
      return suggestedTemplates;
    }
    const q = searchValue.toLowerCase();
    return suggestedTemplates.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q),
    );
  }, [suggestedTemplates, searchValue]);

  const hasNoResults =
    filteredUserTemplates.length === 0 &&
    filteredSuggestedTemplates.length === 0;

  return (
    <div className="w-full h-full flex flex-col">
      <TemplateColumnHeader
        title="Templates"
        searchValue={searchValue}
        onSearchChange={setSearchValue}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {hasNoResults ? (
            <div className="text-center py-8 text-neutral-500">
              <BookText size={32} className="mx-auto mb-2 text-neutral-300" />
              <p className="text-sm">
                {searchValue ? "No templates found" : "No templates yet"}
              </p>
            </div>
          ) : (
            <>
              {filteredUserTemplates.map((template) => (
                <TemplateItem
                  key={template.id}
                  title={template.title}
                  description={template.description}
                  category="mine"
                  isSelected={selectedTemplate === template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                />
              ))}
              {filteredSuggestedTemplates.map((template, index) => (
                <TemplateItem
                  key={`suggested-${index}`}
                  title={template.title}
                  description={template.description}
                  category={template.category}
                  isSelected={false}
                  onClick={() =>
                    onCloneTemplate({
                      title: template.title ?? "",
                      description: template.description ?? "",
                      sections: template.sections ?? [],
                    })
                  }
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplateItem({
  title,
  description,
  category,
  isSelected,
  onClick,
}: {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  const displayTitle = title?.trim() ? title : "Untitled";
  const isMine = category === "mine";

  return (
    <button
      onClick={onClick}
      className={cn([
        "w-full text-left px-3 py-2 rounded-md text-sm border hover:bg-neutral-100 transition-colors",
        isSelected ? "border-neutral-500 bg-neutral-100" : "border-transparent",
      ])}
    >
      <div className="flex items-center gap-2">
        <BookText className="h-4 w-4 text-neutral-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-1">
            {displayTitle}
            {isMine && (
              <span className="text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                Mine
              </span>
            )}
            {category && !isMine && (
              <span className="text-xs text-stone-400 font-mono">
                ({category})
              </span>
            )}
          </div>
          {description && (
            <div className="text-xs text-neutral-500 truncate">
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
