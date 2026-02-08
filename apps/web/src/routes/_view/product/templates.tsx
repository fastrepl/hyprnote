import { createFileRoute, Link } from "@tanstack/react-router";
import { allTemplates } from "content-collections";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/templates")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Custom Templates - Hyprnote" },
      {
        name: "description",
        content:
          "Pick or build a template for your recurring meetings and get perfectly formatted notes automatically. Pre-built and custom templates for every meeting type.",
      },
      {
        property: "og:title",
        content: "Custom Templates - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Pick or build a template for your recurring meetings and get perfectly formatted notes automatically.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/product/templates",
      },
    ],
  }),
});

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <HowItWorksSection />
        <SlashSeparator />
        <PreBuiltOrCustomSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-12 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            Template for Every Meeting Type
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600">
            Pick (or build) a template for your recurring meetings and get
            perfectly formatted notes automatically.
          </p>
          <div className="mt-8">
            <Link
              to="/download/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Download for free
            </Link>
          </div>
        </header>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section className="px-6 py-12 lg:py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 text-center mb-4">
          How it works
        </h2>
        <p className="text-lg text-neutral-600 text-center mb-12">
          You can pick a template before your meeting or try different formats
          later.
        </p>

        <div className="grid sm:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-stone-700">
              Before a meeting
            </h3>
            <div className="aspect-video w-full rounded-xs border border-neutral-200 bg-stone-50 flex items-center justify-center">
              <span className="text-sm text-neutral-400 italic">GIF</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-stone-700">
              After a meeting
            </h3>
            <div className="aspect-video w-full rounded-xs border border-neutral-200 bg-stone-50 flex items-center justify-center">
              <span className="text-sm text-neutral-400 italic">GIF</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PreBuiltOrCustomSection() {
  return (
    <section className="px-6 py-12 lg:py-20 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 text-center mb-12">
          Pre-built or custom — your choice
        </h2>

        <div className="flex flex-col gap-16">
          <div>
            <h3 className="text-xl font-semibold text-stone-700 mb-2">
              Community templates
            </h3>
            <p className="text-base text-neutral-600 mb-6">
              Pre-built templates for common meeting types. Discovery calls,
              sprint planning, 1-on-1s, technical reviews — just pick one and
              use it.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allTemplates.slice(0, 6).map((template) => (
                <a
                  key={template.slug}
                  href={`/templates/${template.slug}`}
                  className="group p-4 border border-neutral-200 rounded-xs bg-white hover:shadow-md hover:border-neutral-300 transition-all"
                >
                  <p className="text-xs text-neutral-500 mb-1">
                    {template.category}
                  </p>
                  <h4 className="font-serif text-base text-stone-600 group-hover:text-stone-800 transition-colors">
                    {template.title}
                  </h4>
                </a>
              ))}
            </div>
            <div className="mt-4 text-center">
              <a
                href="/gallery/?type=template"
                className="text-sm text-stone-600 hover:text-stone-800 underline decoration-dotted underline-offset-2 transition-colors"
              >
                Browse all {allTemplates.length} templates
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-stone-700 mb-2">
              Custom templates
            </h3>
            <p className="text-base text-neutral-600 mb-6">
              Build templates that match your exact workflow. Store them
              locally. Use them whenever you need.
            </p>
            <div className="aspect-video w-full rounded-xs border border-neutral-200 bg-white flex items-center justify-center">
              <span className="text-sm text-neutral-400 italic">Image</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-6 text-center">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600">
          Stop reformatting notes manually
        </h2>
        <p className="text-lg text-neutral-600">
          Download Hyprnote and set up your first template in 30 seconds.
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
