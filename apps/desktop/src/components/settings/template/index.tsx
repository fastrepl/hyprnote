import { useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import { cn } from "@hypr/utils";
import * as internal from "../../../store/tinybase/internal";
import * as persisted from "../../../store/tinybase/persisted";
import { TemplateEditor } from "./editor";

export function SettingsTemplates() {
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);
  const templates = useTemplates();

  if (currentTemplate) {
    return <TemplateEditor id={currentTemplate} onClose={() => setCurrentTemplate(null)} />;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold mb-2">Your Templates</h1>
        <p className="text-sm text-neutral-600">Select a template to enhance your meeting notes</p>
      </div>

      <div className="space-y-3">
        {Object.entries(templates).map(([id, template]) => (
          <TemplateCard
            key={id}
            title={template.title || "Untitled"}
            description={template.description || ""}
            onClick={() => setCurrentTemplate(id)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn([
        "flex items-center gap-4",
        "cursor-pointer transition-colors",
        "p-4 border rounded-lg hover:bg-neutral-50",
      ])}
    >
      <div className="flex-1">
        <h3 className="text-lg font-medium mb-1">{title}</h3>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

function useTemplates() {
  const { user_id } = internal.UI.useValues(internal.STORE_ID);
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const USER_TEMPLATE_QUERY = "user_templates";

  const quries = persisted.UI.useCreateQueries(
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

  const templates = persisted.UI.useResultTable(USER_TEMPLATE_QUERY, quries);
  return templates as unknown as Record<string, persisted.Template>;
}
