import { createFileRoute } from "@tanstack/react-router";

import { AnimatedTitle } from "@/components/animated-title";
import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/jobs/engineer")({
  component: EngineerPage,
  head: () => ({
    meta: [
      { title: "Engineer - Hyprnote" },
      {
        name: "description",
        content:
          "Join Hyprnote as a Product-Minded Engineer. Build with Tauri, Rust, and TypeScript.",
      },
    ],
  }),
});

function EngineerPage() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/slash.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <JobDetailsSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="relative overflow-hidden">
      <img
        src="/api/images/beach.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(12px)",
          mask: "linear-gradient(to bottom, transparent 0%, transparent 50%, black 100%)",
          WebkitMask:
            "linear-gradient(to bottom, transparent 0%, transparent 50%, black 100%)",
        }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-white/60 via-white/70 to-white" />
      <div className="relative px-6 py-24 lg:py-40">
        <div className="text-center max-w-3xl mx-auto">
          <AnimatedTitle
            text="engineer"
            className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-800 mb-4"
          />
          <p className="flex items-center justify-center gap-3 font-mono text-sm text-neutral-600 mb-8">
            full-time, remote
          </p>
          <a
            href="mailto:founders@hyprnote.com?subject=Application for Engineer"
            className="px-6 h-10 inline-flex items-center justify-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Apply now
          </a>
        </div>
      </div>
    </div>
  );
}

function JobDetailsSection() {
  return (
    <div className="px-6 pb-16 lg:pb-24">
      <div className="max-w-2xl mx-auto">
        <JobSection title="not">
          <p className="text-neutral-600 mb-4">
            this might not be a good fit if:
          </p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you prefer backend work and don't care about ui polish
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you need detailed specs or prefer to focus on isolated tasks
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>you see code review as bureaucracy rather than craft</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you move fast by cutting corners or accumulating technical debt
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                you are uncomfortable using ai tools to accelerate development
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
            right now, engineering execution is our main bottleneck. product
            direction is clear and marketing strategy is strong, but code
            quality and consistency depend too much on the founder.
          </p>
          <p className="text-neutral-600 mb-4">
            we are looking for a product-minded engineer to take real ownership
            of code quality across the stack, act as first-line reviewer, and
            help the team move faster without compromising standards.
          </p>
          <p className="text-neutral-600 mb-4">
            this is the highest leverage hire we can make right now.
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
              <span>mrr is growing 10.1% month-over-month</span>
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
                own code quality and consistency across the desktop app and web
                platform
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                build features end-to-end with tauri, rust, and typescript
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                act as first-line code reviewer, reducing founder review load
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>ensure ui quality matches user expectations</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                harness ai tools to move faster without sacrificing quality
              </span>
            </li>
          </ul>
          <p className="text-neutral-600 mb-4">success looks like:</p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                quality = great user experience + clean code, consistently
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                founder review time drops significantly, team moves faster
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>code reviews feel obvious, not debated</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>
                the app feels stable, fast, and polished across platforms
              </span>
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
              <span>an engineer who cares deeply about user experience</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>fast, independent, and comfortable with ownership</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>uncompromising on both code quality and ui polish</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>experienced with tauri, rust, and typescript</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>skilled at using ai tools to accelerate development</span>
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
          <p className="text-neutral-600 mb-4">stack you will use:</p>
          <ul className="space-y-2 text-neutral-600">
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>tauri (must)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>rust (must)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>typescript (must)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-400">•</span>
              <span>ai tools like cursor, claude, etc (should)</span>
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
              <span>salary around 100k to 150k usd</span>
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
      </div>
    </div>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <Image
            src="/api/images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">Interested?</h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          We'd love to hear from you.
        </p>
        <div className="pt-6">
          <a
            href="mailto:founders@hyprnote.com?subject=Application for Engineer"
            className="px-6 h-12 flex items-center justify-center text-base sm:text-lg bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Apply now
          </a>
        </div>
      </div>
    </section>
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
    <div className={isLast ? "" : "mb-8"}>
      <h3 className="text-2xl font-serif text-stone-600 mb-4">{title}</h3>
      {children}
    </div>
  );
}
