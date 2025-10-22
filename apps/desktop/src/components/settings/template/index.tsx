import { Button } from "@hypr/ui/components/ui/button";
import { ButtonGroup } from "@hypr/ui/components/ui/button-group";
import { Input } from "@hypr/ui/components/ui/input";
import { cn } from "@hypr/utils";

import { type NavigateOptions, useSearch } from "@tanstack/react-router";
import { BookText, Search } from "lucide-react";
import { useMemo, useState } from "react";

import * as persisted from "../../../store/tinybase/persisted";
import { TemplateEditor } from "./editor";

type FilterStatus = "all" | "favorite";

interface SettingsTemplatesProps {
  navigate: (opts: NavigateOptions) => Promise<void>;
}

export function SettingsTemplates({ navigate }: SettingsTemplatesProps) {
  const search = useSearch({ strict: false }) as { tab?: string; templateId?: string };
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const templates = persisted.UI.useResultTable(
    persisted.QUERIES.visibleTemplates,
    persisted.STORE_ID,
  ) as unknown as Record<string, persisted.Template>;

  const filteredTemplates = useMemo(() => {
    if (!templates) {
      return [];
    }

    let filtered = Object.entries(templates);

    // Apply favorite filter (placeholder for now)
    if (filterStatus === "favorite") {
      // TODO: Implement favorite filtering when favorite field is added
      filtered = filtered;
    }

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
  }, [searchQuery, filterStatus, templates]);

  if (search.templateId) {
    return <TemplateEditor id={search.templateId} />;
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
            >
              All
            </Button>
            <Button
              variant={filterStatus === "favorite" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("favorite")}
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
            className="pl-9"
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
                  title={template.title || "Untitled"}
                  description={template.description || ""}
                  onClick={() => navigate({ search: { tab: "templates", templateId: id } })}
                />
              ))
            )}
        </div>
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
