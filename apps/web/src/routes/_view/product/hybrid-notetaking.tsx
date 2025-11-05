import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/hybrid-notetaking")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Hybrid Notetaking - Hyprnote" },
      {
        name: "description",
        content:
          "Combine manual and automatic notetaking with Hyprnote. Write your own notes while AI captures and processes everything in the background.",
      },
      { property: "og:title", content: "Hybrid Notetaking - Hyprnote" },
      {
        property: "og:description",
        content: "The best of both worlds: your manual notes enhanced with AI-powered transcription and summaries.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/product/hybrid-notetaking" },
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
              Hybrid notetaking:
              <br />
              Manual meets AI
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Take notes your way while AI works in the background. Hyprnote combines the focus of manual notetaking
              with the completeness of automatic transcription.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">The hybrid approach</h2>
            <div className="grid lg:grid-cols-3 gap-8">
              <HybridFeature
                icon="mdi:pencil"
                title="Your notes"
                description="Write down what matters to you in real-time. Stay engaged and focused on the conversation."
              />
              <HybridFeature
                icon="mdi:plus"
                title="Enhanced with"
                description="AI works silently in the background, capturing everything you might miss."
              />
              <HybridFeature
                icon="mdi:robot"
                title="AI completion"
                description="Get full transcripts, summaries, and insights to complement your manual notes."
              />
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Why hybrid works better
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Benefit
                icon="mdi:brain"
                title="Better retention"
                description="Writing notes manually helps you remember and understand better than passive listening."
              />
              <Benefit
                icon="mdi:shield-check"
                title="Nothing missed"
                description="Even if you're focused on writing, AI captures every word for later review."
              />
              <Benefit
                icon="mdi:target"
                title="Focused attention"
                description="Note what's important to you without worrying about capturing everything perfectly."
              />
              <Benefit
                icon="mdi:layers"
                title="Layered insights"
                description="Your notes provide context, AI provides completeness. Together they're powerful."
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">How it works together</h2>
            <div className="space-y-8">
              <WorkflowStep
                step="During the meeting"
                description="You focus on taking notes that matter to you - key decisions, action items, ideas. Hyprnote records all audio in the background."
                icon="mdi:account-edit"
              />
              <WorkflowStep
                step="After the meeting"
                description="AI processes the recording and generates a full transcript, summary, and key points that complement your notes."
                icon="mdi:auto-fix"
              />
              <WorkflowStep
                step="Review and refine"
                description="See your notes alongside the AI-generated content. Fill in gaps, verify details, and create a complete record."
                icon="mdi:file-document-edit"
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Perfect for</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <PersonaCard
                title="Active learners"
                description="People who learn better by writing but don't want to miss anything."
                icon="mdi:school"
              />
              <PersonaCard
                title="Note enthusiasts"
                description="Those who love their manual note systems but want AI backup."
                icon="mdi:notebook"
              />
              <PersonaCard
                title="Detail-oriented professionals"
                description="Anyone who needs both personal insights and comprehensive records."
                icon="mdi:briefcase"
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Example workflow</h2>
            <div className="grid lg:grid-cols-2 gap-8 items-start">
              <div className="p-6 border-2 border-neutral-200 rounded-lg bg-white">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="mdi:pencil" className="text-2xl text-stone-600" />
                  <h3 className="font-serif text-lg text-stone-600">Your manual notes</h3>
                </div>
                <div className="space-y-3 text-sm text-neutral-700 font-mono bg-stone-50 p-4 rounded">
                  <p>• Discussed Q1 roadmap</p>
                  <p>• Mobile app priority #1</p>
                  <p>• Sarah: need 2 more engineers</p>
                  <p>• Launch target: March 15</p>
                  <p>• TODO: Review designs by Friday</p>
                </div>
              </div>
              <div className="p-6 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="mdi:robot" className="text-2xl text-blue-600" />
                  <h3 className="font-serif text-lg text-blue-900">AI-generated summary</h3>
                </div>
                <div className="space-y-3 text-sm text-blue-900">
                  <div>
                    <div className="font-medium mb-1">Full Context:</div>
                    <p className="text-xs leading-relaxed">
                      Team discussed Q1 2025 roadmap priorities. Mobile app (iOS) identified as highest priority. Sarah
                      mentioned current team capacity constraints and need to hire 2 additional engineers. Target launch
                      date set for March 15, 2025. Design review scheduled for end of week.
                    </p>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Participants:</div>
                    <p className="text-xs">Sarah (PM), Mike (Eng), John (Design)</p>
                  </div>
                  <div>
                    <div className="font-medium mb-1">Exact Quote:</div>
                    <p className="text-xs italic">
                      "We need at least 2 senior engineers to hit the March deadline comfortably" - Sarah
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
              <Icon icon="mdi:check-circle" className="text-3xl text-green-600 mx-auto mb-3" />
              <p className="text-green-900 font-medium">
                Together: Quick reference notes + complete context + exact quotes
              </p>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Get the best of both worlds
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Don't choose between manual and automatic. Have both with Hyprnote's hybrid approach.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://hyprnote.com/download"
                className={cn([
                  "px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Try hybrid notetaking
              </a>
              <Link
                to="/product/ai-notetaking"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                Explore AI features
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function HybridFeature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
        <Icon icon={icon} className="text-3xl text-stone-600" />
      </div>
      <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <Icon icon={icon} className="text-2xl text-stone-600 shrink-0 mt-1" />
      <div>
        <h3 className="font-medium text-stone-600 mb-1">{title}</h3>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

function WorkflowStep({
  step,
  description,
  icon,
}: {
  step: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex gap-6 items-start">
      <div className="shrink-0 w-12 h-12 rounded-lg bg-stone-600 text-white flex items-center justify-center">
        <Icon icon={icon} className="text-2xl" />
      </div>
      <div>
        <h3 className="text-xl font-serif text-stone-600 mb-2">{step}</h3>
        <p className="text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

function PersonaCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white">
      <Icon icon={icon} className="text-3xl text-stone-600 mb-4" />
      <h3 className="text-lg font-serif text-stone-600 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
