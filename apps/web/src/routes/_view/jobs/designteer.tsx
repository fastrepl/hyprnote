import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

import { AnimatedText } from "@/components/animated-text";
import { AnimatedTitle } from "@/components/animated-title";
import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/jobs/designteer")({
  component: DesignteerPage,
  head: () => ({
    meta: [
      { title: "Designteer - Hyprnote" },
      {
        name: "description",
        content:
          "Join Hyprnote as a Designteer - designer + marketer + engineer.",
      },
    ],
  }),
});

function DesignteerPage() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
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
        src="/api/images/meadow.png"
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
            text="designteer"
            className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-800 mb-4"
          />
          <p className="flex items-center justify-center gap-3 font-mono text-sm text-neutral-600 mb-8">
            full-time, remote
          </p>
          <a
            href="mailto:founders@hyprnote.com?subject=Application for Designteer"
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
            This might <strong>NOT</strong> be a good fit if:
          </p>
          <ul className="list-disc list-inside space-y-2 text-neutral-600">
            <li>You only want to design in Figma</li>
            <li>You prefer mockups over shipping</li>
            <li>You skip quality to move fast</li>
            <li>You need process to make progress</li>
            <li>You don't want to do marketing</li>
            <li>You want a short-term role</li>
          </ul>
        </JobSection>

        <JobSection title="why">
          <p className="text-neutral-600 mb-4">
            Hyprnote is product-led. Design execution is our bottleneck - visual
            quality depends too much on the founder. We need someone to own
            design across product and marketing.
          </p>
          <p className="text-neutral-600 mb-4">
            Some context: 38% week-5 retention, 30% WoW DAU growth, 9.2% web
            conversion, 7.4k GitHub stars, 10% MoM MRR growth - all organically.{" "}
            <AnimatedText
              text="We're not stopping here - this is just the start."
              className="text-neutral-400"
            />
          </p>
          <p className="text-neutral-600">
            Small team. High trust. Craft over hype.
          </p>
        </JobSection>

        <JobSection title="what">
          <p className="text-neutral-600 mb-4">
            Own visual quality across product, website, and marketing. Design
            and ship real UI. Create assets for launches and content. Build a
            design system that actually gets used.
          </p>
          <p className="text-neutral-600">
            Success: the product feels calmer, marketing doesn't wait on the
            founder, design decisions feel obvious.
          </p>
        </JobSection>

        <JobSection title="who">
          <p className="text-neutral-600">
            A designer who codes and ships. Fast, independent, uncompromising on
            quality. Interested in marketing and storytelling. Prefers
            responsibility over rigid scope.
          </p>
        </JobSection>

        <JobSection title="how">
          <p className="text-neutral-600 mb-4">
            Remote-first. Async via{" "}
            <Icon
              icon="logos:slack-icon"
              className="inline-block align-middle mb-1"
            />{" "}
            Slack, occasional calls. Everything runs through{" "}
            <Icon
              icon="logos:github-icon"
              className="inline-block align-middle mb-1"
            />{" "}
            GitHub.
          </p>
          <p className="text-neutral-600 mb-4">
            You must be comfortable with{" "}
            <Icon
              icon="logos:figma"
              className="inline-block align-middle mb-0.5"
            />{" "}
            Figma, a code editor, and basic video editing.
          </p>
        </JobSection>

        <JobSection title="compensation" isLast>
          <p className="text-neutral-600 mb-4">
            Ballpark: $80–120k/year, 0.5–1.5% equity. Depends on scope and
            experience.
          </p>
          <p className="text-neutral-600">
            Early, high-ownership role. You'll grow with the company.
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
            href="mailto:founders@hyprnote.com?subject=Application for Designteer"
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
    <div className={isLast ? "" : "mb-12"}>
      <h3 className="text-lg font-serif tracking-widest uppercase text-neutral-400 mb-6">
        {title}
      </h3>
      {children}
    </div>
  );
}
