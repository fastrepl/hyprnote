import { BookText } from "lucide-react";
import { useMemo } from "react";
import { createQueries } from "tinybase/with-schemas";

import * as main from "../../../store/tinybase/main";
import { TemplateCard } from "./shared";
import { filterTemplatesByQuery, normalizeTemplateWithId } from "./utils";

export function LocalTemplates({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (id: string) => void;
}) {
  const templates = useTemplates();

  const trimmedQuery = query.trim();

  const filteredTemplates = useMemo(
    () => filterTemplatesByQuery(templates, trimmedQuery),
    [templates, trimmedQuery],
  );

  return (
    <div>
      <h2 className="font-semibold cursor-default mb-4">Templates</h2>
      <UserTemplatesList templates={filteredTemplates} onSelect={onSelect} hasQuery={trimmedQuery.length > 0} />
    </div>
  );
}

function UserTemplatesList({
  templates,
  onSelect,
  hasQuery,
}: {
  templates: Array<main.Template & { id: string }>;
  onSelect: (id: string) => void;
  hasQuery: boolean;
}) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <BookText size={48} className="mx-auto mb-4 text-neutral-300" />
        <p className="text-sm">{hasQuery ? "No templates found" : "No templates yet"}</p>
        <p className="text-xs text-neutral-400 mt-1">
          {hasQuery ? "Try a different search term" : "Create a template to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          title={template.title}
          description={template.description}
          onClick={() => onSelect(template.id)}
        />
      ))}
    </div>
  );
}

function useTemplates(): Array<main.Template & { id: string }> {
  const { user_id } = main.UI.useValues(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const USER_TEMPLATE_QUERY = "user_templates";

  const queries = main.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(USER_TEMPLATE_QUERY, "templates", ({ select, where }) => {
        select("title");
        select("description");
        select("sections");
        select("created_at");
        select("user_id");
        where("user_id", user_id ?? "");
      }),
    [user_id],
  );

  const templates = main.UI.useResultTable(USER_TEMPLATE_QUERY, queries);

  return useMemo(() => {
    return Object.entries(templates as Record<string, unknown>).map(([id, template]) =>
      normalizeTemplateWithId(id, template)
    );
  }, [templates]);
}
