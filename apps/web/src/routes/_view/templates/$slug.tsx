import { MDXContent } from "@content-collections/mdx/react";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { allTemplates } from "content-collections";

import { DownloadButton } from "@/components/download-button";

export const Route = createFileRoute("/_view/templates/$slug")({
  component: Component,
  beforeLoad: ({ params }) => {
    const template = allTemplates.find((t) => t.slug === params.slug);
    if (!template) {
      throw redirect({
        to: "/templates",
      });
    }
  },
  loader: async ({ params }) => {
    const template = allTemplates.find((t) => t.slug === params.slug);
    return { template: template! };
  },
  head: ({ loaderData }) => {
    const { template } = loaderData!;
    const url = `https://hyprnote.com/templates/${template.slug}`;
    const ogImageUrl = `https://hyprnote.com/og?type=templates&title=${encodeURIComponent(template.title)}&category=${encodeURIComponent(template.category)}${template.description ? `&description=${encodeURIComponent(template.description)}` : ""}`;

    return {
      meta: [
        { title: `${template.title} - Meeting Template - Hyprnote` },
        { name: "description", content: template.description },
        {
          property: "og:title",
          content: `${template.title} - Meeting Template`,
        },
        { property: "og:description", content: template.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: ogImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: `${template.title} - Meeting Template`,
        },
        { name: "twitter:description", content: template.description },
        { name: "twitter:image", content: ogImageUrl },
      ],
    };
  },
});

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

function Component() {
  const { template } = Route.useLoaderData();
  const icon = getIconForTemplate(template.title);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-4xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-16">
          <Link
            to="/templates"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors text-sm mb-8"
          >
            <span>←</span>
            <span>Back to templates</span>
          </Link>

          <header className="mb-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="shrink-0 w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center">
                <Icon icon={icon} className="text-2xl text-stone-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-full">
                    {template.category}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-serif text-stone-600">
                  {template.title}
                </h1>
              </div>
            </div>
            <p className="text-lg text-neutral-600 leading-relaxed">
              {template.description}
            </p>
          </header>

          <section className="mb-12">
            <h2 className="text-xl font-serif text-stone-600 mb-4">Best for</h2>
            <div className="flex flex-wrap gap-2">
              {template.targets.map((target) => (
                <span
                  key={target}
                  className="text-sm px-3 py-1.5 bg-stone-50 text-stone-600 rounded-full border border-stone-200"
                >
                  {target}
                </span>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-serif text-stone-600 mb-4">
              Template sections
            </h2>
            <div className="space-y-4">
              {template.sections.map((section, index) => (
                <div
                  key={section.title}
                  className="p-4 border border-neutral-200 rounded-lg bg-white"
                >
                  <div className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-stone-100 text-stone-600 text-sm flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="font-medium text-stone-700 mb-1">
                        {section.title}
                      </h3>
                      {section.description && (
                        <p className="text-sm text-neutral-600">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-serif text-stone-600 mb-4">
              Template preview
            </h2>
            <article className="prose prose-stone prose-headings:font-serif prose-headings:font-semibold prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-a:text-stone-600 prose-a:underline prose-a:decoration-dotted hover:prose-a:text-stone-800 prose-code:bg-stone-50 prose-code:border prose-code:border-neutral-200 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono prose-code:text-stone-700 max-w-none p-6 border border-neutral-200 rounded-lg bg-stone-50/50">
              <MDXContent code={template.mdx} />
            </article>
          </section>

          <section className="py-12 border-t border-neutral-100">
            <div className="text-center space-y-6">
              <h2 className="text-2xl font-serif text-stone-600">
                Use this template in Hyprnote
              </h2>
              <p className="text-neutral-600 max-w-lg mx-auto">
                Download Hyprnote and select this template to automatically
                structure your meeting notes with AI.
              </p>
              <div className="flex flex-col items-center gap-4">
                <DownloadButton />
                <p className="text-sm text-neutral-500">
                  Free to use. No credit card required.
                </p>
              </div>
            </div>
          </section>

          <footer className="pt-8 border-t border-neutral-100">
            <Link
              to="/templates"
              className="inline-flex items-center gap-2 text-neutral-600 hover:text-stone-600 transition-colors font-medium"
            >
              <span>←</span>
              <span>Browse all templates</span>
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
