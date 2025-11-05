import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { allTemplates } from "content-collections";

export const Route = createFileRoute("/api/templates")({
  server: {
    handlers: {
      GET: async () => {
        const templates = allTemplates.map((template) => ({
          slug: template.slug,
          title: template.title,
          description: template.description,
          sections: template.sections,
        }));

        return json(templates);
      },
    },
  },
});
