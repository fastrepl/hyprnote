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
    navigate({ search: category ? { category } : {}, resetScroll: false });
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
        <ContributeBanner />
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
        <QuoteSection />
        <MobileCategoriesSection
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
        <TemplatesSection
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          templatesByCategory={templatesByCategory}
          filteredTemplates={filteredTemplates}
          setSelectedTemplate={setSelectedTemplate}
        />
        <SlashSeparator />
        <CTASection />
      </div>

      <TemplateModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
      />
    </div>
  );
}

function ContributeBanner() {
  return (
    <a
      href="https://github.com/fastrepl/hyprnote/tree/main/apps/web/content/templates"
      target="_blank"
      rel="noopener noreferrer"
      className={cn([
        "group flex items-center justify-center gap-2 text-center cursor-pointer",
        "bg-stone-50/70 border-b border-stone-100 hover:bg-stone-100/70",
        "py-3 px-4",
        "font-serif text-sm text-stone-700",
        "transition-colors",
      ])}
    >
      <Icon icon="mdi:github" className="text-base" />
      <span>
        <strong>Community-driven:</strong> Have a template idea?{" "}
        <span className="group-hover:underline group-hover:decoration-dotted group-hover:underline-offset-2">
          Contribute on GitHub
        </span>
      </span>
    </a>
  );
}

function HeroSection({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <section className="flex flex-col items-center text-center gap-8 py-24 px-4 laptop:px-0">
        <div className="space-y-6 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
            Templates
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Different conversations need different approaches. Templates are AI
            instructions that capture best practices for each meeting type —
            plug them in and get structured notes instantly.
          </p>
        </div>

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
  );
}

function QuoteSection() {
  return (
    <div className="py-4 px-4 text-center border-y border-neutral-100 bg-white bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-size-[24px_24px] bg-position-[12px_12px,12px_12px]">
      <p className="text-base text-stone-600 font-serif italic">
        "Curated by Hyprnote and the community"
      </p>
    </div>
  );
}

function MobileCategoriesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}) {
  return (
    <div className="lg:hidden border-b border-neutral-100 bg-stone-50">
      <div className="flex overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn([
            "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 cursor-pointer",
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
              "px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-r border-neutral-100 last:border-r-0 cursor-pointer",
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
  );
}

function TemplatesSection({
  categories,
  selectedCategory,
  setSelectedCategory,
  templatesByCategory,
  filteredTemplates,
  setSelectedTemplate,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  templatesByCategory: Record<string, typeof allTemplates>;
  filteredTemplates: typeof allTemplates;
  setSelectedTemplate: (template: (typeof allTemplates)[0]) => void;
}) {
  return (
    <div className="px-6 pt-8 pb-12 lg:pt-12 lg:pb-20">
      <div className="flex gap-8">
        <DesktopSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          templatesByCategory={templatesByCategory}
        />
        <TemplatesGrid
          filteredTemplates={filteredTemplates}
          setSelectedTemplate={setSelectedTemplate}
        />
      </div>
    </div>
  );
}

function DesktopSidebar({
  categories,
  selectedCategory,
  setSelectedCategory,
  templatesByCategory,
}: {
  categories: string[];
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  templatesByCategory: Record<string, typeof allTemplates>;
}) {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-[85px]">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
          Categories
        </h3>
        <nav className="space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn([
              "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
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
                "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
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
  );
}

function TemplatesGrid({
  filteredTemplates,
  setSelectedTemplate,
}: {
  filteredTemplates: typeof allTemplates;
  setSelectedTemplate: (template: (typeof allTemplates)[0]) => void;
}) {
  if (filteredTemplates.length === 0) {
    return (
      <section className="flex-1 min-w-0">
        <div className="text-center py-12">
          <Icon
            icon="mdi:file-search"
            className="text-6xl text-neutral-300 mb-4 mx-auto"
          />
          <p className="text-neutral-600">
            No templates found matching your search.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 min-w-0">
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.slug}
            template={template}
            onClick={() => setSelectedTemplate(template)}
          />
        ))}
        <ContributeCard />
      </div>
    </section>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: (typeof allTemplates)[0];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group p-4 border border-neutral-200 rounded-sm bg-white hover:shadow-md hover:border-neutral-300 transition-all text-left cursor-pointer flex flex-col items-start"
    >
      <div className="mb-4">
        <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
          {template.title}
        </h3>
        <p className="text-sm text-neutral-600 line-clamp-2">
          {template.description}
        </p>
      </div>
      <div className="pt-4 border-t border-neutral-100">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
          For
        </div>
        <div className="flex flex-wrap gap-2">
          {template.targets.slice(0, 3).map((target) => (
            <span
              key={target}
              className="text-xs px-2 py-1 bg-stone-50 text-stone-600 rounded"
            >
              {target}
            </span>
          ))}
          {template.targets.length > 3 && (
            <span className="text-xs px-2 py-1 text-neutral-500">
              +{template.targets.length - 3} more
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ContributeCard() {
  return (
    <div className="p-4 border border-dashed border-neutral-300 rounded-sm bg-stone-50/50 flex flex-col items-center justify-center text-center">
      <h3 className="font-serif text-lg text-stone-600 mb-2">
        Contribute a template
      </h3>
      <p className="text-sm text-neutral-500 mb-4">
        Have a template idea? Submit a PR and help the community.
      </p>
      <a
        href="https://github.com/fastrepl/hyprnote/tree/main/apps/web/content/templates"
        target="_blank"
        rel="noopener noreferrer"
        className={cn([
          "group px-4 h-10 inline-flex items-center justify-center gap-2 w-fit",
          "bg-linear-to-t from-neutral-800 to-neutral-700 text-white rounded-full",
          "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
          "transition-all cursor-pointer text-sm",
        ])}
      >
        <Icon icon="mdi:github" className="text-base" />
        Open on GitHub
      </a>
    </div>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-6 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
          Ready to transform your meetings?
        </h2>
        <p className="text-lg text-neutral-600">
          Download Hyprnote and start using these templates to capture perfect
          meeting notes with AI.
        </p>
        <div className="flex flex-col items-center gap-4 pt-4">
          <DownloadButton />
          <p className="text-sm text-neutral-500">
            Free to use. No credit card required.
          </p>
        </div>
      </div>
    </section>
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
