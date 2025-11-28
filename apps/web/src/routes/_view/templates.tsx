import { Icon } from "@iconify-icon/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { allTemplates } from "content-collections";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hypr/ui/components/ui/dialog";
import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { SlashSeparator } from "@/components/slash-separator";

type TemplatesSearch = {
  category?: string;
};

export const Route = createFileRoute("/_view/templates")({
  component: Component,
  validateSearch: (search: Record<string, unknown>): TemplatesSearch => {
    return {
      category:
        typeof search.category === "string" ? search.category : undefined,
    };
  },
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

function Component() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof allTemplates)[0] | null
  >(null);

  const selectedCategory = search.category || null;

  const setSelectedCategory = (category: string | null) => {
    navigate({ search: category ? { category } : {} });
  };

  const templatesByCategory = getTemplatesByCategory();
  const categories = Object.keys(templatesByCategory);

  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;

    if (selectedCategory) {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query),
      );
    }

    return templates;
  }, [searchQuery, selectedCategory]);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        {/* Hero Section */}
        <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
          <section className="flex flex-col items-center text-center gap-12 py-24 px-4 laptop:px-0">
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
                Meeting templates for <br className="hidden sm:block" />
                every conversation
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600">
                Choose from {allTemplates.length} templates to structure your AI
                summaries. <br className="hidden sm:block" />
                From sprint planning to sales calls, find the perfect format.
              </p>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-xs">
              <div className="relative flex items-center border-2 border-neutral-200 focus-within:border-stone-500 rounded-full overflow-hidden transition-all duration-200">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm outline-none bg-white text-center placeholder:text-center"
                />
              </div>
            </div>
          </section>
        </div>

        <SlashSeparator />

        {/* Mobile/Tablet: Horizontal scrollable categories - full width */}
        <div className="lg:hidden border-b border-neutral-100 bg-stone-50">
          <div className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn([
                "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100",
                selectedCategory === null
                  ? "bg-stone-600 text-white"
                  : "text-stone-600 hover:bg-stone-100",
              ])}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn([
                  "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 last:border-r-0",
                  selectedCategory === category
                    ? "bg-stone-600 text-white"
                    : "text-stone-600 hover:bg-stone-100",
                ])}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates List with Sidebar */}
        <div className="px-6 py-12 lg:py-20">
          {/* Desktop: Sidebar + Templates */}
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="sticky top-[85px]">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  Categories
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn([
                      "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      selectedCategory === null
                        ? "bg-stone-100 text-stone-800"
                        : "text-stone-600 hover:bg-stone-50",
                    ])}
                  >
                    All Templates
                    <span className="ml-2 text-xs text-neutral-400">
                      ({allTemplates.length})
                    </span>
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn([
                        "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        selectedCategory === category
                          ? "bg-stone-100 text-stone-800"
                          : "text-stone-600 hover:bg-stone-50",
                      ])}
                    >
                      {category}
                      <span className="ml-2 text-xs text-neutral-400">
                        ({templatesByCategory[category].length})
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Templates Grid */}
            <section className="flex-1 min-w-0">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <Icon
                    icon="mdi:file-search"
                    className="text-6xl text-neutral-300 mb-4 mx-auto"
                  />
                  <p className="text-neutral-600">
                    No templates found matching your search.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.slug}
                      template={template}
                      onClick={() => setSelectedTemplate(template)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <SlashSeparator />

        {/* CTA Section */}
        <section className="py-16 px-6 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
              Ready to transform your meetings?
            </h2>
            <p className="text-lg text-neutral-600">
              Download Hyprnote and start using these templates to capture
              perfect meeting notes with AI.
            </p>
            <div className="flex flex-col items-center gap-4 pt-4">
              <DownloadButton />
              <p className="text-sm text-neutral-500">
                Free to use. No credit card required.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Template Detail Modal */}
      <TemplateModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </div>
  );
}

function getTemplatesByCategory() {
  return allTemplates.reduce(
    (acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, typeof allTemplates>,
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
  onClick,
}: {
  template: (typeof allTemplates)[0];
  onClick: () => void;
}) {
  const icon = getIconForTemplate(template.title);

  return (
    <button
      onClick={onClick}
      className="group p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-md hover:border-neutral-300 transition-all text-left cursor-pointer"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
          <Icon icon={icon} className="text-xl text-stone-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
            {template.title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>
      <div className="pt-4 border-t border-neutral-100">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
          Sections
        </div>
        <div className="flex flex-wrap gap-2">
          {template.sections.slice(0, 3).map((section) => (
            <span
              key={section.title}
              className="text-xs px-2 py-1 bg-stone-50 text-stone-600 rounded"
            >
              {section.title}
            </span>
          ))}
          {template.sections.length > 3 && (
            <span className="text-xs px-2 py-1 text-neutral-500">
              +{template.sections.length - 3} more
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function TemplateModal({
  template,
  onClose,
}: {
  template: (typeof allTemplates)[0] | null;
  onClose: () => void;
}) {
  if (!template) return null;

  const icon = getIconForTemplate(template.title);

  return (
    <Dialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
              <Icon icon={icon} className="text-2xl text-stone-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-serif text-2xl text-stone-600">
                {template.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-neutral-500 mt-1">
                {template.category}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <p className="text-neutral-600 mb-6">{template.description}</p>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-stone-600 uppercase tracking-wider">
              Template Sections
            </h4>
            <div className="space-y-3">
              {template.sections.map((section, index) => (
                <div
                  key={section.title}
                  className="p-4 rounded-lg bg-stone-50 border border-stone-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-xs font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h5 className="font-medium text-stone-700">
                      {section.title}
                    </h5>
                  </div>
                  <p className="text-sm text-neutral-600 ml-9">
                    {section.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <DownloadButton />
              <p className="text-sm text-neutral-500 text-center sm:text-left">
                Download Hyprnote to use this template
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
