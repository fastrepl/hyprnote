import { BookText } from "lucide-react";
import { useMemo } from "react";
import { createQueries } from "tinybase/with-schemas";

import * as main from "../../../store/tinybase/main";
import { TemplateCard } from "./shared";
import { normalizeTemplateWithId, useTemplateNavigation } from "./utils";

export function LocalTemplates({ query }: { query: string }) {
  return (
    <div>
      <h2 className="font-semibold cursor-default mb-4">Your templates</h2>
      <UserTemplatesList query={query} />
    </div>
  );
}

function UserTemplatesList({ query }: { query: string }) {
  const templates = useTemplates();

  const { goToEdit } = useTemplateNavigation();

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500 bg-neutral-50 rounded-lg p-4 border border-neutral-200">
        <BookText size={48} className="mx-auto mb-4 text-neutral-300" />
        <p className="text-sm">
          {query.length > 0 ? "No templates found" : "No templates yet"}
        </p>
        <p className="text-xs text-neutral-400 mt-1">
          {query.length > 0
            ? "Try a different search term"
            : "Create a template to get started."}
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
          onClick={() => goToEdit(template.id)}
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
