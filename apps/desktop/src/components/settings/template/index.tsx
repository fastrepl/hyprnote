import { useQuery } from "@tanstack/react-query";
import { BookText } from "lucide-react";
import { useMemo, useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import * as main from "../../../store/tinybase/main";
import { TemplateEditor } from "./editor";
import { TemplateSearch } from "./search";
import { TemplateCard } from "./shared";
import { normalizeTemplateWithId, useTemplateNavigation } from "./utils";

export function SettingsTemplates() {
  const { templateId } = useTemplateNavigation();

  if (templateId) {
    return <TemplateEditor id={templateId} />;
  }

  return <TemplateList />;
}

function TemplateList() {
  const [searchQuery, setSearchQuery] = useState("");
  const userTemplates = useUserTemplates();
  const { data: suggestedTemplates = [] } = useSuggestedTemplates(searchQuery);
  const { goToEdit, cloneAndEdit } = useTemplateNavigation();

  const hasNoResults =
    userTemplates.length === 0 && suggestedTemplates.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-600 mb-4">
          Create templates to structure and standardize your meeting notes
        </p>
        <div className="rounded-xl border border-neutral-200 bg-stone-50 mb-6">
          <TemplateSearch value={searchQuery} onChange={setSearchQuery} />
        </div>

        {hasNoResults ? (
          <div className="text-center py-12 text-neutral-500 bg-neutral-50 rounded-lg p-4 border border-neutral-200">
            <BookText size={48} className="mx-auto mb-4 text-neutral-300" />
            <p className="text-sm">
              {searchQuery.length > 0
                ? "No templates found"
                : "No templates yet"}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {searchQuery.length > 0
                ? "Try a different search term"
                : "Create a template to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                title={template.title}
                description={template.description}
                category="mine"
                targets={template.targets}
                onClick={() => goToEdit(template.id)}
              />
            ))}
            {suggestedTemplates.map((template, index) => (
              <TemplateCard
                key={`suggested-${index}`}
                title={template.title}
                description={template.description}
                category={template.category}
                targets={template.targets}
                onClick={() =>
                  cloneAndEdit({
                    title: template.title,
                    description: template.description,
                    sections: template.sections,
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useUserTemplates(): Array<main.Template & { id: string }> {
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

function useSuggestedTemplates(query: string) {
  return useQuery({
    queryKey: ["settings", "templates", "suggestions"],
    queryFn: async () => {
      const response = await fetch("https://hyprnote.com/api/templates", {
        headers: { Accept: "application/json" },
      });
      const data: main.Template[] = await response.json();
      return data;
    },
    select: (data) => {
      if (!query) {
        return data;
      }

      const lowerQuery = query.toLowerCase();

      return data.filter((template) => {
        const titleMatch = template.title.toLowerCase().includes(lowerQuery);
        const categoryMatch = template.category
          ?.toLowerCase()
          .includes(lowerQuery);
        const targetsMatch = template.targets?.some((target) =>
          target?.toLowerCase().includes(lowerQuery),
        );

        return titleMatch || categoryMatch || targetsMatch;
      });
    },
  });
}
