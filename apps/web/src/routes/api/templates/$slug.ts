import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { allTemplates } from "content-collections";

export const Route = createFileRoute("/api/templates/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { slug } = params;

        const template = allTemplates.find((t) => t.slug === slug);

        if (!template) {
          return new Response("Template not found", {
            status: 404,
          });
        }

        return json({
          slug: template.slug,
          title: template.title,
          description: template.description,
          sections: template.sections,
        });
      },
    },
  },
});
