import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/notetaking")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Smart Notetaking App - Hyprnote" },
      {
        name: "description",
        content:
          "Hyprnote is a powerful notetaking app that captures both your microphone and system audio, giving you complete context for every conversation and meeting.",
      },
      { property: "og:title", content: "Smart Notetaking App - Hyprnote" },
      {
        property: "og:description",
        content:
          "Capture everything with dual-audio notetaking. Record mic and system audio simultaneously for complete meeting context.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/product/notetaking" },
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
              Notetaking that captures
              <br />
              everything
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote is a note-taking app designed to capture the full context of your conversations by recording both
              your microphone and system audio simultaneously.
            </p>
          </header>

          <section className="mb-20">
            <div className="grid md:grid-cols-2 gap-8">
              <FeatureCard
                icon="mdi:microphone"
                title="Microphone Capture"
                description="Record your voice clearly with high-quality microphone input. Perfect for capturing your questions, thoughts, and contributions to any conversation."
              />
              <FeatureCard
                icon="mdi:speaker"
                title="System Audio Recording"
                description="Capture audio from your computer - video calls, presentations, webinars, and any sound playing on your system."
              />
              <FeatureCard
                icon="mdi:video-outline"
                title="Universal Compatibility"
                description="Works with Zoom, Meet, Teams, Slack, Discord, and any other application. No need to join meetings as a bot."
              />
              <FeatureCard
                icon="mdi:brain"
                title="AI-Powered Insights"
                description="Automatically generate summaries, extract action items, and get intelligent insights from every conversation."
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">How it works</h2>
            <div className="space-y-6">
              <Step
                number={1}
                title="Start recording"
                description="Open Hyprnote and hit record before your meeting or conversation starts."
              />
              <Step
                number={2}
                title="Dual audio capture"
                description="We capture both your microphone input and system audio output, giving you complete context."
              />
              <Step
                number={3}
                title="AI processing"
                description="After the conversation, our local AI processes everything and generates transcripts, summaries, and insights."
              />
              <Step
                number={4}
                title="Searchable notes"
                description="All your conversations become searchable, organized notes with key takeaways and action items."
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Perfect for</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <UseCase
                icon="mdi:account-tie"
                title="Remote meetings"
                description="Never miss important details from video calls and virtual meetings."
              />
              <UseCase
                icon="mdi:school"
                title="Online learning"
                description="Capture lectures, webinars, and educational content effortlessly."
              />
              <UseCase
                icon="mdi:chat"
                title="Interviews"
                description="Record and transcribe interviews for accurate reference."
              />
              <UseCase
                icon="mdi:presentation"
                title="Presentations"
                description="Document presentations and demos with both audio streams."
              />
              <UseCase
                icon="mdi:account-group"
                title="Team collaboration"
                description="Keep your team aligned with comprehensive meeting records."
              />
              <UseCase
                icon="mdi:lightbulb"
                title="Brainstorming"
                description="Capture every idea during creative sessions without interruption."
              />
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Ready to elevate your notetaking?
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who trust Hyprnote to capture their most important conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://hyprnote.com/download"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Download for free
              </a>
              <Link
                to="/product/local"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                Learn about local AI
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      <Icon icon={icon} className="text-3xl text-stone-600 mb-4" />
      <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-stone-600 text-white flex items-center justify-center font-medium">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-serif text-stone-600 mb-1">{title}</h3>
        <p className="text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

function UseCase({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white">
      <Icon icon={icon} className="text-2xl text-stone-600 mb-3" />
      <h3 className="font-medium text-stone-600 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </div>
  );
}
