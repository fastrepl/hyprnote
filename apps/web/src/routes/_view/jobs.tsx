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

const jobs = [
  {
    id: "designer",
    title: "Designer",
    type: "Full-time",
    location: "Remote",
    description:
      "We're looking for a designer who loves creating simple and intuitive user interfaces. You'll work closely with our team to shape the future of Hyprnote's design.",
  },
  {
    id: "engineer",
    title: "Engineer",
    type: "Full-time",
    location: "Remote",
    description:
      "We're looking for an engineer who is passionate about building great software. You'll work on our desktop app, web platform, and AI features.",
  },
];

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
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
        <div className="mt-12 text-center">
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
      </div>
    </section>
  );
}

function JobCard({ job }: { job: (typeof jobs)[0] }) {
  return (
    <div className="border border-neutral-200 rounded-lg p-6 hover:border-stone-400 transition-colors bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-medium text-stone-600 mb-2">
            {job.title}
          </h2>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span>{job.type}</span>
            <span className="text-neutral-300">|</span>
            <span>{job.location}</span>
          </div>
        </div>
        <a
          href={`mailto:jobs@hyprnote.com?subject=Application for ${job.title}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium shrink-0"
        >
          Apply
          <ArrowRight className="size-4" />
        </a>
      </div>
      <p className="mt-4 text-neutral-600">{job.description}</p>
    </div>
  );
}
