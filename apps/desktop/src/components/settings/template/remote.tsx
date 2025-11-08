import { useQuery } from "@tanstack/react-query";

import * as main from "../../../store/tinybase/main";
import { TemplateCard } from "./shared";

interface RemoteTemplatesProps {
  query: string;
  onClone: (template: main.Template) => void;
}

export function RemoteTemplates({ query, onClone }: RemoteTemplatesProps) {
  const { data: templates = [] } = useSuggestedTemplates(query);

  return (
    <div className="space-y-4">
      {templates.map((template, index) => (
        <SuggestedTemplateCard
          key={index}
          template={template}
          onClone={onClone}
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

      return data.filter((template) => template.title.includes(query));
    },
  });
}

function SuggestedTemplateCard({
  template,
  onClone,
}: {
  template: main.Template;
  onClone: (template: main.Template) => void;
}) {
  return (
    <TemplateCard
      title={template.title}
      description={template.description}
      onClick={() => onClone(template)}
    />
  );
}
