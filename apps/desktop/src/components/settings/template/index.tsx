import { useQuery } from "@tanstack/react-query";
import { BookText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import { Button } from "@hypr/ui/components/ui/button";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import * as main from "../../../store/tinybase/main";
import { TemplateEditor } from "./editor";
import { useTemplateNavigation } from "./use-template-navigation";

export function SettingsTemplates() {
  const { templateId } = useTemplateNavigation();

  if (templateId) {
    return <TemplateEditor id={templateId} />;
  }

  return <TemplateList />;
}

function TemplateList() {
  const [searchQuery, setSearchQuery] = useState("");
  const templates = useTemplates();
  const { goToEdit, cloneAndEdit } = useTemplateNavigation();
  const {
    data: suggestedTemplates = [],
    isLoading: isLoadingSuggestions,
    isError: hasSuggestionsError,
    refetch: refetchSuggestions,
  } = useSuggestedTemplates();

  const trimmedQuery = searchQuery.trim();

  const filteredTemplates = useMemo(() => {
    if (!trimmedQuery) {
      return templates;
    }

    const query = trimmedQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.title.toLowerCase().includes(query)
        || template.description.toLowerCase().includes(query),
    );
  }, [templates, trimmedQuery]);

  const filteredSuggestedTemplates = useMemo(() => {
    if (!trimmedQuery) {
      return suggestedTemplates;
    }

    const query = trimmedQuery.toLowerCase();
    return suggestedTemplates.filter((template) => {
      if (template.title.toLowerCase().includes(query)) {
        return true;
      }

      if (template.description.toLowerCase().includes(query)) {
        return true;
      }

      return template.sections.some((section) =>
        section.title.toLowerCase().includes(query) || section.description.toLowerCase().includes(query)
      );
    });
  }, [suggestedTemplates, trimmedQuery]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-semibold cursor-default mb-4">Templates</h2>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={16} />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 shadow-none"
          />
        </div>

        <div className="space-y-4">
          {filteredTemplates.length === 0
            ? (
              <div className="text-center py-12 text-neutral-500">
                <BookText size={48} className="mx-auto mb-4 text-neutral-300" />
                <p className="text-sm">No templates found</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Try a different search term
                </p>
              </div>
            )
            : (
              filteredTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onSelect={goToEdit} />
              ))
            )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold cursor-default">Suggested templates</h3>
        {isLoadingSuggestions
          ? <p className="text-xs text-neutral-500">Loading suggested templates...</p>
          : hasSuggestionsError
          ? (
            <div className="space-y-3 text-xs text-neutral-600">
              <p>Failed to load suggested templates.</p>
              <Button variant="outline" size="sm" onClick={() => refetchSuggestions()} className="w-fit">
                Retry
              </Button>
            </div>
          )
          : filteredSuggestedTemplates.length === 0
          ? (
            <p className="text-xs text-neutral-500">
              {trimmedQuery
                ? "No suggested templates match your search."
                : "No suggested templates available right now."}
            </p>
          )
          : (
            <div className="space-y-4">
              {filteredSuggestedTemplates.map((template, index) => (
                <SuggestedTemplateCard
                  key={`${template.slug}-${index}`}
                  template={template}
                  onClone={cloneAndEdit}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

interface TemplateWithId {
  id: string;
  title: string;
  description: string;
  sections: main.TemplateSection[];
}

interface SuggestedTemplate {
  slug: string;
  title: string;
  description: string;
  sections: main.TemplateSection[];
}

function TemplateCard({ template, onSelect }: { template: TemplateWithId; onSelect: (id: string) => void }) {
  return (
    <div
      onClick={() => onSelect(template.id)}
      className={cn([
        "flex items-start gap-4",
        "cursor-pointer transition-colors",
        "p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50",
      ])}
    >
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{template.title || "Untitled"}</h3>
        <p className="text-xs text-neutral-600">{template.description}</p>
      </div>
    </div>
  );
}

function SuggestedTemplateCard({
  template,
  onClone,
}: {
  template: SuggestedTemplate;
  onClone: (template: SuggestedTemplate) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 border border-neutral-200 rounded-lg">
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{template.title}</h3>
        <p className="text-xs text-neutral-600">
          {template.description || "No description provided."}
        </p>
      </div>
      <Button size="sm" onClick={() => onClone(template)}>
        Clone & Edit
      </Button>
    </div>
  );
}

function useTemplates(): TemplateWithId[] {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const USER_TEMPLATE_QUERY = "user_templates";

  const quries = main.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(USER_TEMPLATE_QUERY, "templates", ({ select, where }) => {
        select("title");
        select("description");
        select("sections");
        where("user_id", user_id ?? "");
      }),
    [user_id],
  );

  const templates = main.UI.useResultTable(USER_TEMPLATE_QUERY, quries);

  return useMemo(() => {
    return Object.entries(templates as Record<string, any>).map(([id, template]) => ({
      id,
      title: template.title || "",
      description: template.description || "",
      sections: typeof template.sections === "string" ? JSON.parse(template.sections) : template.sections || [],
    }));
  }, [templates]);
}

function useSuggestedTemplates() {
  return useQuery<SuggestedTemplate[]>({
    queryKey: ["settings", "templates", "suggestions"],
    queryFn: fetchSuggestedTemplates,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

async function fetchSuggestedTemplates(): Promise<SuggestedTemplate[]> {
  const response = await fetch("https://hyprnote.com/api/templates", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load templates (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid templates response");
  }

  const seen = new Set<string>();

  return data.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const template = entry as Record<string, unknown>;
    const slugValue = template.slug;
    const rawSlug = typeof slugValue === "string" ? slugValue.trim() : "";
    const slug = rawSlug.length > 0 ? rawSlug : generateSuggestionId();
    if (seen.has(slug)) {
      return [];
    }

    const titleValue = template.title;
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    if (!title) {
      return [];
    }

    seen.add(slug);

    const descriptionValue = template.description;
    const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";

    const sectionsValue = template.sections;
    const sectionsSource = Array.isArray(sectionsValue) ? sectionsValue : [];
    const sections: main.TemplateSection[] = sectionsSource.flatMap((sectionEntry) => {
      if (!sectionEntry || typeof sectionEntry !== "object") {
        return [];
      }

      const section = sectionEntry as Record<string, unknown>;
      const sectionTitleValue = section.title;
      const sectionDescriptionValue = section.description;

      const sectionTitle = typeof sectionTitleValue === "string" ? sectionTitleValue.trim() : "";
      const sectionDescription = typeof sectionDescriptionValue === "string" ? sectionDescriptionValue.trim() : "";

      if (!sectionTitle && !sectionDescription) {
        return [];
      }

      return [
        {
          title: sectionTitle,
          description: sectionDescription,
        } satisfies main.TemplateSection,
      ];
    });

    return [
      {
        slug,
        title,
        description,
        sections,
      } satisfies SuggestedTemplate,
    ];
  });
}

function generateSuggestionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
