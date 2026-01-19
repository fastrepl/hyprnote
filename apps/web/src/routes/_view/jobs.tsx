import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Mail } from "lucide-react";

export const Route = createFileRoute("/_view/jobs")({
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Jobs - Hyprnote" },
      {
        name: "description",
        content: "Join the Hyprnote team. View open positions and apply.",
      },
    ],
  }),
});

function JobsPage() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <JobsSection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="px-6 py-16 lg:py-24">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          Jobs
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Join us in building the future of note-taking. We're a small team with
          big ambitions.
        </p>
      </div>
    </div>
  );
}

function JobsSection() {
  return (
    <section className="pb-16 lg:pb-24">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <DesignteerJob />
        <EngineerJob />
      </div>
      <div className="mt-12 text-center px-6">
        <p className="text-neutral-600 mb-4">
          Don't see a role that fits? We'd still love to hear from you.
        </p>
        <a
          href="mailto:jobs@hyprnote.com"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors underline decoration-dotted"
        >
          <Mail className="size-4" />
          jobs@hyprnote.com
        </a>
      </div>
    </section>
  );
}

function DesignteerJob() {
  return (
    <div className="p-8 text-left border-b md:border-b-0 md:border-r border-neutral-100 relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/api/images/meadow.png)",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-white/95 via-white/90 to-white/95" />
      <div className="relative z-10">
        <h2 className="text-xl font-medium text-stone-600 mb-2">Designteer</h2>
        <p className="text-sm text-neutral-500 mb-4">
          designer + engineer + marketer
        </p>
        <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
          <span>Full-time</span>
          <span className="text-neutral-300">|</span>
          <span>Remote</span>
        </div>
        <p className="text-neutral-600 leading-relaxed mb-6">
          Own visual quality across product and marketing. Design and ship real
          UI. Work with a small, high-trust team that values craft and long-term
          thinking.
        </p>
        <Link
          to="/jobs/designteer/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium"
        >
          Interested?
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

function EngineerJob() {
  return (
    <div className="p-8 text-left relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/api/images/beach.png)",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-white/95 via-white/90 to-white/95" />
      <div className="relative z-10">
        <h2 className="text-xl font-medium text-stone-600 mb-2">Engineer</h2>
        <div className="flex items-center gap-3 text-sm text-neutral-500 mb-4">
          <span>Full-time</span>
          <span className="text-neutral-300">|</span>
          <span>Remote</span>
        </div>
        <p className="text-neutral-600 leading-relaxed mb-6">
          Build great software with passion. Work on our desktop app, web
          platform, and AI features. Join a team that cares about craft and
          quality.
        </p>
        <Link
          to="/jobs/engineer/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium"
        >
          Interested?
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
