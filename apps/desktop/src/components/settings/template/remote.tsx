import { useQuery } from "@tanstack/react-query";

import * as main from "../../../store/tinybase/main";
import { TemplateCard } from "./shared";
import { useTemplateNavigation } from "./utils";

export function RemoteTemplates({ query }: { query: string }) {
  const { data: templates = [] } = useSuggestedTemplates(query);

  if (templates.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="font-semibold cursor-default mb-4">Suggested templates</h2>
      <TemplateList templates={templates} />
    </div>
  );
}

function TemplateList({ templates }: { templates: main.Template[] }) {
  const { cloneAndEdit } = useTemplateNavigation();

  return (
    <div className="space-y-4">
      {templates.map((template, index) => (
        <TemplateCard
          key={index}
          title={template.title}
          description={template.description}
          category={template.category}
          targets={template.targets}
          onClick={() =>
            cloneAndEdit({
              title: template.title,
              description: template.description,
              sections: template.sections,
            })}
        />
      ))}
    </div>
  );
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
        const categoryMatch = template.category?.toLowerCase().includes(lowerQuery);
        const targetsMatch = template.targets?.some((target) => target.toLowerCase().includes(lowerQuery));

        return titleMatch || categoryMatch || targetsMatch;
      });
    },
  });
}
