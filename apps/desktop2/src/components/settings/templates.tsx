import { useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import * as internal from "../../store/tinybase/internal";
import * as persisted from "../../store/tinybase/persisted";
import { useUpdateTemplate } from "./shared";

export function SettingsTemplates() {
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  const { user_id } = internal.UI.useValues(internal.STORE_ID);
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const USER_TEMPLATE_QUERY = "user_templates";

  const quries = persisted.UI.useCreateQueries(
    store,
    (store) =>
      createQueries(store).setQueryDefinition(USER_TEMPLATE_QUERY, "templates", ({ select, where }) => {
        select("title");
        select("sections");
        where("user_id", user_id ?? "");
      }),
    [user_id],
  );

  const templates = persisted.UI.useResultTable(USER_TEMPLATE_QUERY, quries);

  if (currentTemplate) {
    return <TemplateEditor id={currentTemplate} />;
  }

  return (
    <div>
      <h1>Templates</h1>
      {Object.entries(templates).map(([id, template]) => (
        <div
          key={id}
          onClick={() => setCurrentTemplate(id)}
          className="cursor-pointer"
        >
          {template.title}
        </div>
      ))}
    </div>
  );
}

function TemplateEditor({ id }: { id: string }) {
  const { value, handle } = useUpdateTemplate(id);

  return (
    <div>
      <h1>Template Editor</h1>
      <pre className="text-xs border border-gray-200 rounded-md p-2">{JSON.stringify(value, null, 2)}</pre>
      <input
        value={value.title}
        onChange={(e) => handle.setField("title", e.target.value)}
      />
    </div>
  );
}
