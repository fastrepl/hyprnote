import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/about")({
  component: Component,
  head: () => ({
    meta: [
      { title: "About Hyprnote - Our Story" },
      {
        name: "description",
        content:
          "Learn about Hyprnote's mission to make notetaking effortless while keeping your data private. Built by Fastrepl.",
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
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Making notetaking
              <br />
              effortless
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              We believe that capturing and organizing your conversations shouldn't be a chore. That's why we built
              Hyprnote - a tool that listens, learns, and helps you remember what matters.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Our Mission</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon icon="mdi:shield-lock" className="text-4xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-3">Privacy First</h3>
                <p className="text-neutral-600 leading-relaxed">
                  Your conversations are personal. We process everything locally on your device using on-device AI, so
                  your data never leaves your computer.
                </p>
              </div>
              <div className="p-8 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon icon="mdi:lightning-bolt" className="text-4xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-3">Effortless Capture</h3>
                <p className="text-neutral-600 leading-relaxed">
                  Stop worrying about missing important details. Hyprnote captures both your mic and system audio,
                  giving you complete context for every conversation.
                </p>
              </div>
              <div className="p-8 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon icon="mdi:brain" className="text-4xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-3">Intelligent Organization</h3>
                <p className="text-neutral-600 leading-relaxed">
                  AI helps you find what matters. Automatic transcription, smart summaries, and searchable notes mean
                  you'll never lose track of important information.
                </p>
              </div>
              <div className="p-8 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon icon="mdi:tools" className="text-4xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-3">Built for Everyone</h3>
                <p className="text-neutral-600 leading-relaxed">
                  From remote workers to students, from entrepreneurs to executives - Hyprnote adapts to your workflow
                  and helps you work smarter.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-6">Our Story</h2>
            <div className="prose prose-stone max-w-none">
              <p className="text-lg text-neutral-600 leading-relaxed mb-4">
                Hyprnote was born from a simple frustration: trying to take notes while staying engaged in important
                conversations. Whether it was a crucial client call, a brainstorming session with the team, or an online
                lecture, we found ourselves constantly torn between listening and writing.
              </p>
              <p className="text-lg text-neutral-600 leading-relaxed mb-4">
                We looked for solutions, but everything required bots joining meetings, cloud uploads, or compromising
                on privacy. We knew there had to be a better way.
              </p>
              <p className="text-lg text-neutral-600 leading-relaxed">
                That's when we started building Hyprnote - a desktop application that captures audio locally, processes
                it with on-device AI, and gives you the freedom to be fully present in your conversations while never
                missing a detail.
              </p>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">What We Stand For</h2>
            <div className="space-y-6">
              <ValueItem
                icon="mdi:lock"
                title="Privacy is non-negotiable"
                description="We will never compromise on privacy. Your data belongs to you, period."
              />
              <ValueItem
                icon="mdi:transparency"
                title="Transparency in everything"
                description="We're open about how Hyprnote works, from our tech stack to our pricing model."
              />
              <ValueItem
                icon="mdi:account-group"
                title="Community-driven development"
                description="We build features our users actually need, guided by your feedback and requests."
              />
              <ValueItem
                icon="mdi:rocket"
                title="Continuous improvement"
                description="We ship updates regularly and are always working to make Hyprnote better."
              />
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
              Built by Fastrepl
            </h2>
            <p className="text-lg text-neutral-600 text-center max-w-2xl mx-auto mb-8">
              Hyprnote is developed by Fastrepl, a team dedicated to building productivity tools that respect your
              privacy and enhance your workflow.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/team"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Meet the team
              </Link>
              <a
                href="https://github.com/fastrepl/hyprnote"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                View on GitHub
              </a>
            </div>
          </section>

          <section className="text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Ready to transform your notetaking?
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who trust Hyprnote to capture their most important conversations.
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

function ValueItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6 items-start p-6 border border-neutral-200 rounded-lg bg-white">
      <div className="shrink-0 w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
        <Icon icon={icon} className="text-2xl text-stone-600" />
      </div>
      <div>
        <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
        <p className="text-neutral-600">{description}</p>
      </div>
    </div>
  );
}
