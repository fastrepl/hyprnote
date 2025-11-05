import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { allTemplates } from "content-collections";

export const Route = createFileRoute("/_view/product/templates")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Meeting Templates - Hyprnote" },
      {
        name: "description",
        content:
          "Browse templates for different meeting types. Hyprnote uses templates to structure AI-generated summaries.",
      },
    ],
  }),
});

function Component() {
  // Group templates by category
  const templatesByCategory = allTemplates.reduce((acc, template) => {
    const category = getCategory(template.title);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof allTemplates>);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Templates for every
              <br />
              meeting type
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote uses templates to structure AI-generated summaries. Choose from our library of
              {allTemplates.length} templates or create your own custom format.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">How templates work</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  1
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Select a template</h3>
                <p className="text-sm text-neutral-600">
                  Choose a template that matches your meeting type
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  2
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Record your meeting</h3>
                <p className="text-sm text-neutral-600">
                  Hyprnote captures the conversation
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  3
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Get structured notes</h3>
                <p className="text-sm text-neutral-600">
                  AI generates notes following your template
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Browse templates</h2>

            {Object.entries(templatesByCategory).map(([category, templates]) => (
              <div key={category} className="mb-12">
                <h3 className="text-xl font-serif text-stone-600 mb-6 pb-2 border-b border-neutral-200">
                  {category}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => <TemplateCard key={template.slug} template={template} />)}
                </div>
              </div>
            ))}
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
              Create custom templates
            </h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-2xl mx-auto">
              Need a specific format? Create your own custom templates to match your unique workflow and meeting
              structure.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Icon icon="mdi:pencil" className="text-2xl text-stone-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Define sections</h3>
                  <p className="text-sm text-neutral-600">
                    Specify what sections you want in your notes
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:format-list-bulleted" className="text-2xl text-stone-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Add instructions</h3>
                  <p className="text-sm text-neutral-600">
                    Tell AI what to look for in each section
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:star" className="text-2xl text-stone-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Reuse anytime</h3>
                  <p className="text-sm text-neutral-600">
                    Save and use your template for future meetings
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Get started with templates
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Download Hyprnote and start using templates to structure your meeting notes.
            </p>
            <a
              href="https://hyprnote.com/download"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Download for free
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}

function getCategory(title: string): string {
  // Engineering/Development
  if (
    ["Sprint Planning", "Sprint Retrospective", "Daily Standup", "Technical Design Review", "Incident Postmortem"]
      .includes(
        title,
      )
  ) {
    return "Engineering & Development";
  }
  // Product & Design
  if (["Product Roadmap Review", "Customer Discovery Interview", "Brainstorming Session"].includes(title)) {
    return "Product & Design";
  }
  // Sales & Customer Success
  if (["Sales Discovery Call", "Client Kickoff Meeting"].includes(title)) {
    return "Sales & Customer Success";
  }
  // Leadership & Management
  if (
    ["1:1 Meeting", "Performance Review", "Executive Briefing", "Board Meeting", "Project Kickoff"].includes(
      title,
    )
  ) {
    return "Leadership & Management";
  }
  // Learning & Research
  if (["Lecture Notes"].includes(title)) {
    return "Learning & Research";
  }
  // Business Development
  if (["Investor Pitch Meeting"].includes(title)) {
    return "Business Development";
  }
  return "General";
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

function TemplateCard({ template }: { template: (typeof allTemplates)[0] }) {
  const icon = getIconForTemplate(template.title);

  return (
    <div className="group p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
          <Icon icon={icon} className="text-xl text-stone-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
            {template.title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2">{template.description}</p>
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
    </div>
  );
}
