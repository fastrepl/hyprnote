import { BookText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { createQueries } from "tinybase/with-schemas";

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
  const { goToEdit } = useTemplateNavigation();

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return templates;
    }

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (template) =>
        template.title.toLowerCase().includes(query)
        || template.description.toLowerCase().includes(query),
    );
  }, [searchQuery, templates]);

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
    </div>
  );
}

interface TemplateWithId {
  id: string;
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
