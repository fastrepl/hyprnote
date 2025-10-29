import { BookText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { createQueries } from "tinybase/with-schemas";

import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import * as internal from "../../../store/tinybase/internal";
import * as main from "../../../store/tinybase/main";
import { TemplateEditor } from "./editor";
import { useTemplateNavigation } from "./use-template-navigation";

type FilterStatus = "all" | "favorite";

export function SettingsTemplates() {
  const { templateId } = useTemplateNavigation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const templates = useTemplates();

  const filteredTemplates = useMemo(() => {
    let filtered = Object.entries(templates);

    // TODO: Implement favorite filtering when favorite field is added

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        ([_, template]) =>
          (template.title || "").toLowerCase().includes(query)
          || (template.description || "").toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [searchQuery, templates]);

  if (templateId) {
    return <TemplateEditor id={templateId} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold cursor-default">Templates</h2>
          <ButtonGroup>
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className="shadow-none"
            >
              All
            </Button>
            <Button
              variant={filterStatus === "favorite" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("favorite")}
              className="shadow-none"
            >
              Favorite
            </Button>
          </ButtonGroup>
        </div>

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
              filteredTemplates.map(([id, template]) => (
                <TemplateCard
                  key={id}
                  id={id}
                  title={template.title || "Untitled"}
                  description={template.description || ""}
                />
              ))
            )}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  const { goToEdit } = useTemplateNavigation();

  return (
    <div
      onClick={() => goToEdit(id)}
      className={cn([
        "flex items-start gap-4",
        "cursor-pointer transition-colors",
        "p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50",
      ])}
    >
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-1">{title}</h3>
        <p className="text-xs text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

function useTemplates() {
  const { user_id } = internal.UI.useValues(internal.STORE_ID);
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
  return templates as unknown as Record<string, main.Template>;
}
