import { createFileRoute } from "@tanstack/react-router";
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
    <section className="px-6 pb-16 lg:pb-24">
      <div className="max-w-2xl mx-auto">
        <DesignteerJob />
        <EngineerJob />
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

function DesignteerJob() {
  return (
    <div className="mb-12">
      <div className="border border-neutral-200 rounded-lg p-8 bg-white">
        <div className="mb-8">
          <h2 className="text-2xl font-serif text-stone-600 mb-2">
            designteer
          </h2>
          <p className="text-neutral-500 mb-4">
            designer + engineer + marketer
          </p>
          <div className="flex items-center gap-3 text-sm text-neutral-600">
            <span className="font-medium italic">hyprnote</span>
            <span className="text-neutral-300">·</span>
            <span>full-time</span>
            <span className="text-neutral-300">·</span>
            <span>core team</span>
          </div>
        </div>

        <JobSection title="not">
          <p className="text-neutral-600 mb-4">
            this might not be a good fit if:
          </p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you only want to design in figma and hand work off to engineers
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>you prefer mockups over shipping real ui</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you move fast by cutting corners or accumulating visual debt
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you need heavy process, specs, or constant alignment to make
                progress
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you see marketing or growth work as secondary to "real" design
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you are looking for a short-term contract or advisory role
              </span>
            </li>
          </ul>
        </JobSection>

        <JobSection title="why">
          <p className="text-neutral-600 mb-4">
            hyprnote is a product-led company. quality directly impacts
            retention, trust, and growth.
          </p>
          <p className="text-neutral-600 mb-4">
            right now, design execution is our main bottleneck. product
            direction is clear and marketing strategy is strong, but visual
            quality and consistency depend too much on the founder.
          </p>
          <p className="text-neutral-600 mb-4">
            we are looking for a designteer to take real ownership of design
            quality across product and marketing, raise the baseline, and help
            the team move faster without compromising standards.
          </p>
          <p className="text-neutral-600 mb-4">
            a few real numbers, just for context:
          </p>
          <ul className="space-y-2 text-neutral-600 mb-4">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>app week 5 retention is 38%</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>app dau is growing 30 percent week-over-week</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>web conversion rate is 9.2%</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>github has 7.4k stars</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>mrr is growing 10.1% month-over-week</span>
            </li>
          </ul>
          <p className="text-neutral-600">
            you will be working with a small, high-trust team that values craft,
            clarity, and long-term thinking over hype.
          </p>
        </JobSection>

        <JobSection title="what">
          <p className="text-neutral-600 mb-4">you will:</p>
          <ul className="space-y-2 text-neutral-600 mb-6">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                own visual quality and consistency across the product, website,
                and marketing
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>design and ship real ui in production</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                create visual assets for blog posts, landing pages, and launches
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                build and maintain a design system engineers actually use
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                reduce review overhead by raising the baseline quality
              </span>
            </li>
          </ul>
          <p className="text-neutral-600 mb-4">success looks like:</p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                the product feels calmer, clearer, and more intentional
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>marketing no longer waits on the founder for visuals</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>design decisions feel obvious, not debated</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>quality is consistent across product and web</span>
            </li>
          </ul>
        </JobSection>

        <JobSection title="who">
          <p className="text-neutral-600 mb-4">
            you are likely a good fit if you are:
          </p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>a designer who can code and enjoys shipping</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>fast, independent, and comfortable with ownership</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>uncompromising on user-facing quality</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                genuinely interested in marketing, storytelling, and conversion
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>someone who prefers responsibility over rigid scope</span>
            </li>
          </ul>
        </JobSection>

        <JobSection title="how">
          <p className="text-neutral-600 mb-4">we are a remote-first team.</p>
          <p className="text-neutral-600 mb-4">communication and workflow:</p>
          <ul className="space-y-2 text-neutral-600 mb-6">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>slack for primary async communication</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>occasional phone calls, huddles, or zoom</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>github issues for tickets</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>github projects for sprints and task management</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>github discussions for feedback</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>discord for community</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>zendesk for real-time support</span>
            </li>
          </ul>
          <p className="text-neutral-600 mb-4">tools you will use:</p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>figma (must)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>content admin (must)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>code editor (should)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>video editor (could)</span>
            </li>
          </ul>
        </JobSection>

        <JobSection title="comp" isLast>
          <p className="text-neutral-600 mb-4">
            compensation depends on scope and experience.
          </p>
          <p className="text-neutral-600 mb-4">as a rough ballpark:</p>
          <ul className="space-y-2 text-neutral-600 mb-4">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>salary around 80k to 120k usd</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>equity around 2 to 4 percent</span>
            </li>
          </ul>
          <p className="text-neutral-600">
            this is an early, high-ownership role. the right person will grow
            with the company.
          </p>
        </JobSection>

        <div className="mt-8 pt-8 border-t border-neutral-100">
          <a
            href="mailto:jobs@hyprnote.com?subject=Application for Designteer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
          >
            Apply
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function JobSection({
  title,
  children,
  isLast = false,
}: {
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={isLast ? "" : "mb-8 pb-8 border-b border-neutral-100"}>
      <h3 className="text-lg font-medium text-stone-600 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EngineerJob() {
  return (
    <div className="mb-8">
      <div className="border border-neutral-200 rounded-lg p-6 hover:border-stone-400 transition-colors bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium text-stone-600 mb-2">
              Engineer
            </h2>
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <span>Full-time</span>
              <span className="text-neutral-300">|</span>
              <span>Remote</span>
            </div>
          </div>
          <a
            href="mailto:jobs@hyprnote.com?subject=Application for Engineer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors text-sm font-medium shrink-0"
          >
            Apply
            <ArrowRight className="size-4" />
          </a>
        </div>
        <p className="mt-4 text-neutral-600">
          We're looking for an engineer who is passionate about building great
          software. You'll work on our desktop app, web platform, and AI
          features.
        </p>
      </div>
    </div>
  );
}
