import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { allTemplates } from "content-collections";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/templates")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Meeting Templates - Hyprnote" },
      {
        name: "description",
        content:
          "Discover our library of AI meeting templates. Get structured summaries for sprint planning, sales calls, 1:1s, and more. Create custom templates for your workflow.",
      },
      { property: "og:title", content: "Meeting Templates - Hyprnote" },
      {
        property: "og:description",
        content:
          "Browse our collection of AI meeting templates. From engineering standups to sales discovery calls, find the perfect template for your meeting type.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/templates" },
    ],
  }),
});

const gradients = [
  "from-emerald-100 via-teal-50 to-cyan-100",
  "from-amber-100 via-orange-50 to-yellow-100",
  "from-violet-100 via-purple-50 to-fuchsia-100",
  "from-sky-100 via-blue-50 to-indigo-100",
  "from-rose-100 via-pink-50 to-red-100",
  "from-lime-100 via-green-50 to-emerald-100",
];

function Component() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100/50 via-white to-white">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 mx-4 my-8 overflow-hidden">
          <div className="px-8 pt-10 pb-6">
            <h1 className="text-3xl font-bold text-neutral-800">Templates</h1>
            <p className="text-neutral-500 mt-1">
              Browse and use meeting templates for better AI summaries.
            </p>
          </div>

          <div className="px-8 pb-4">
            <h2 className="text-sm font-medium text-neutral-500">
              Featured templates
            </h2>
          </div>

          <div className="px-8 pb-10">
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-8 px-8 scrollbar-hide">
              {allTemplates.map((template, index) => (
                <TemplateCard
                  key={template.slug}
                  template={template}
                  gradientIndex={index % gradients.length}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getIconForTemplate(title: string): string {
  const iconMap: Record<string, string> = {
    "Daily Standup": "mdi:run-fast",
    "Sprint Planning": "mdi:calendar-star",
    "Sprint Retrospective": "mdi:mirror",
    "Product Roadmap Review": "mdi:road-variant",
    "Customer Discovery Interview": "mdi:account-search",
    "Sales Discovery Call": "mdi:phone",
    "Technical Design Review": "mdi:draw",
    "Executive Briefing": "mdi:tie",
    "Board Meeting": "mdi:office-building",
    "Performance Review": "mdi:chart-line",
    "Client Kickoff Meeting": "mdi:rocket-launch",
    "Brainstorming Session": "mdi:lightbulb-on",
    "Incident Postmortem": "mdi:alert-circle",
    "Lecture Notes": "mdi:school",
    "Investor Pitch Meeting": "mdi:cash-multiple",
    "1:1 Meeting": "mdi:account-multiple",
    "Project Kickoff": "mdi:flag",
  };
  return iconMap[title] || "mdi:file-document";
}

function TemplateCard({
  template,
  gradientIndex,
}: {
  template: (typeof allTemplates)[0];
  gradientIndex: number;
}) {
  const icon = getIconForTemplate(template.title);
  const gradient = gradients[gradientIndex];

  return (
    <div
      className={cn([
        "flex-shrink-0 w-80 rounded-2xl overflow-hidden",
        "bg-gradient-to-br",
        gradient,
        "shadow-sm hover:shadow-md transition-shadow",
      ])}
    >
      <div className="p-5 h-full flex flex-col">
        <div className="flex-1">
          <div className="space-y-1.5">
            {template.sections.slice(0, 6).map((section) => (
              <p
                key={section.title}
                className="text-sm text-neutral-600/80 truncate"
              >
                {section.title}
              </p>
            ))}
            {template.sections.length > 6 && (
              <p className="text-sm text-neutral-500/60">
                +{template.sections.length - 6} more
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-amber-200/80 flex items-center justify-center">
              <Icon icon={icon} className="text-sm text-amber-700" />
            </div>
            <span className="font-semibold text-neutral-800">
              {template.title}
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">{template.category}</p>
        </div>
      </div>
    </div>
  );
}
