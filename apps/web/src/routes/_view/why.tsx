import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { SlashSeparator } from "@/components/slash-separator";
import { CTASection } from "@/routes/_view/index";

export const Route = createFileRoute("/_view/why")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Why Hyprnote - AI Meeting Notes You Actually Own" },
      {
        name: "description",
        content:
          "Your meeting notes should be files on your computer, not rows in someone else's database. Plain Markdown files, AI providers you can switch, no bots, no lock-in.",
      },
      { property: "og:title", content: "Why Hyprnote" },
      {
        property: "og:description",
        content:
          "Most AI note-takers lock your data in their database. We thought that was bullshit. So we built Hyprnote differently.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/why" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Why Hyprnote" },
      {
        name: "twitter:description",
        content:
          "Your meeting notes should be files on your computer, not rows in someone else's database.",
      },
    ],
  }),
});

function Component() {
  const heroInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <SlashSeparator />
        <HowWeGotHereSection />
        <SlashSeparator />
        <WhyWereDifferentSection />
        <SlashSeparator />
        <WhoThisIsForSection />
        <SlashSeparator />
        <WhatWereBuildingTowardSection />
        <SlashSeparator />
        <HereForTheLongHaulSection />
        <SlashSeparator />
        <TryItNowSection />
        <SlashSeparator />
        <CTASection heroInputRef={heroInputRef} />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-16 lg:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-stone-600 mb-8">
            Why Hyprnote exists
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed mb-6">
            Most AI note-takers lock your data in their database, force you to
            use their AI stack, and disappear your notes if you leave them.
          </p>
          <p className="text-xl sm:text-2xl font-medium text-stone-700 mb-8">
            We thought that was bullshit.
          </p>
          <p className="text-lg text-neutral-600 leading-relaxed mb-4">
            So we built Hyprnote on a simple idea:{" "}
            <span className="font-semibold text-stone-700">
              your meeting notes should be files on your computer, not rows in
              someone else's database.
            </span>
          </p>
          <p className="text-neutral-600 leading-relaxed mb-8">
            Plain Markdown files you actually own. AI providers you can switch
            between. A desktop app that works offline and doesn't send bots to
            your meetings.
          </p>
          <p className="text-neutral-600 italic">
            If Hyprnote disappeared tomorrow, you'd still have everything.
            That's the point.
          </p>
        </div>
      </div>
    </div>
  );
}

function HowWeGotHereSection() {
  return (
    <section className="px-6 py-16 lg:py-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-8 text-center">
          How we got here
        </h2>

        <div className="flex flex-col gap-6 text-neutral-700 leading-relaxed">
          <p className="text-lg font-medium text-stone-700">
            Hyprnote started because I couldn't find what I needed.
          </p>

          <p>
            I've used Obsidian for 5 years. I sync my daily life to my personal
            website. I write everything down—not because I'll forget, but
            because it's who I am.
          </p>

          <p>
            But when it came to meetings? Every tool wanted to lock me into
            their ecosystem. Cloud-only. Proprietary formats. Meeting bots that
            join calls and make everyone uncomfortable. AI stacks I couldn't
            swap out.
          </p>

          <p>
            I wanted something simple:{" "}
            <span className="font-semibold text-stone-700">
              a notepad that transcribes meetings, saves files locally, and gets
              out of my way.
            </span>
          </p>

          <p className="text-lg font-medium text-stone-700">
            Couldn't find it. Built it instead.
          </p>
        </div>
      </div>
    </section>
  );
}

const differentiators = [
  {
    title: "Plain Markdown files",
    description: "instead of proprietary databases",
    icon: "mdi:file-document-outline",
  },
  {
    title: "No meeting bots",
    description:
      "system audio capture works everywhere (Zoom, Teams, phone calls, in-person)",
    icon: "mdi:microphone-off",
  },
  {
    title: "Choose your AI",
    description:
      "use our managed service, bring your own key (OpenAI, Anthropic, Deepgram), or run fully local models",
    icon: "mdi:brain",
  },
  {
    title: "Open source",
    description: "the code is public, security teams can audit it",
    icon: "mdi:github",
  },
  {
    title: "Zero lock-in",
    description:
      "export anytime, switch providers anytime, or just stop using us",
    icon: "mdi:lock-open-outline",
  },
];

function WhyWereDifferentSection() {
  return (
    <section className="px-6 py-16 lg:py-24 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4 text-center">
          Why we're different
        </h2>
        <p className="text-lg text-neutral-600 text-center mb-12">
          We break every AI note-taker rule:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((item, index) => (
            <div
              key={item.title}
              className={cn([
                "p-6 bg-white rounded-lg border border-neutral-100 shadow-sm",
                index === differentiators.length - 1 &&
                  differentiators.length % 3 === 1 &&
                  "lg:col-start-2",
                index === differentiators.length - 2 &&
                  differentiators.length % 3 === 2 &&
                  "lg:col-start-1",
              ])}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-stone-100 rounded-lg shrink-0">
                  <Icon icon={item.icon} className="text-2xl text-stone-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-stone-700 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-neutral-600">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-neutral-600 mt-12 text-lg">
          Most competitors optimize for SaaS convenience.{" "}
          <span className="font-medium text-stone-700">
            We optimize for long-term ownership.
          </span>
        </p>
      </div>
    </section>
  );
}

const audiences = [
  {
    title: "Your company banned Otter/Fireflies/Granola",
    description:
      "Your IT team can audit the open-source code. Files stay on your device. You can use whichever AI provider your company already approved or run everything locally.",
    icon: "mdi:shield-check-outline",
  },
  {
    title: "You're deep into Obsidian/Logseq/PKM systems",
    description:
      "You've spent years building a knowledge vault in Markdown. Your meeting notes shouldn't live in a separate app that doesn't integrate with anything.",
    icon: "mdi:note-multiple-outline",
  },
  {
    title: "You already pay for OpenAI/Anthropic API credits",
    description:
      "Why pay markup on top of API costs you already have? Bring your own key and use the credits you're already buying.",
    icon: "mdi:key-outline",
  },
  {
    title: "You're an open-source advocate who self-hosts everything",
    description:
      "You run Nextcloud, care about FOSS, and need to verify no data leaves your infrastructure. Hyprnote lets you audit the code and run everything locally.",
    icon: "mdi:server-outline",
  },
  {
    title: "You just want a simple notepad that works",
    description:
      "You don't care about the philosophy. You want to take notes during calls without thinking about it. Hyprnote does that.",
    icon: "mdi:notebook-outline",
  },
];

function WhoThisIsForSection() {
  return (
    <section className="px-6 py-16 lg:py-24">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-12 text-center">
          Who this is for
        </h2>

        <div className="flex flex-col gap-8">
          {audiences.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-6 bg-stone-50/50 rounded-lg border border-neutral-100"
            >
              <div className="p-2 bg-white rounded-lg shrink-0 h-fit border border-neutral-100">
                <Icon icon={item.icon} className="text-2xl text-stone-600" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-700 mb-2">
                  {item.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatWereBuildingTowardSection() {
  return (
    <section className="px-6 py-16 lg:py-24 bg-stone-50/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-8">
          What we're building toward
        </h2>

        <div className="flex flex-col gap-6 text-neutral-700 leading-relaxed">
          <p>
            We're not betting on GPT-5 or Claude Opus 7 or whatever comes next.
          </p>

          <p className="text-xl font-semibold text-stone-700">
            We're betting on files.
          </p>

          <p>
            Files outlive apps. Files work with every tool. Files don't
            disappear when a startup shuts down.
          </p>

          <p>
            AI providers will come and go. SaaS platforms will rise and fall.
            But Markdown files from 2005 still open perfectly in 2025.
          </p>

          <p className="text-lg font-medium text-stone-700">
            That's the foundation. Everything else is just software on top.
          </p>
        </div>
      </div>
    </section>
  );
}

const commitments = [
  "No auto-renewal traps",
  "No annual price increases",
  "No forcing you onto annual contracts",
  'No hiding features behind "contact sales"',
  "No meeting bots that make your coworkers uncomfortable",
];

function HereForTheLongHaulSection() {
  return (
    <section className="px-6 py-16 lg:py-24">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-8 text-center">
          Here for the long haul
        </h2>

        <div className="flex flex-col gap-6 text-neutral-700 leading-relaxed">
          <p>
            This isn't a bait-and-switch. We're not looking to get acquired and
            cash out.
          </p>

          <p>
            <span className="font-semibold text-stone-700">
              We're building the company we want to work for
            </span>
            —one that treats users the way we'd want to be treated.
          </p>

          <p>That means:</p>

          <ul className="flex flex-col gap-3">
            {commitments.map((commitment) => (
              <li key={commitment} className="flex items-center gap-3">
                <div className="p-1 bg-stone-100 rounded-full shrink-0">
                  <Icon icon="mdi:check" className="text-lg text-stone-600" />
                </div>
                <span>{commitment}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4">
            If that sounds like the kind of company you want to support,{" "}
            <Link
              to="/"
              hash="hero"
              className="font-semibold text-stone-700 hover:underline decoration-dotted"
            >
              download Hyprnote and try it
            </Link>
            .
          </p>

          <p className="text-lg font-medium text-stone-700">
            If we screw this up, you can export everything and walk away. That's
            the deal.
          </p>
        </div>
      </div>
    </section>
  );
}

function TryItNowSection() {
  return (
    <section className="px-6 py-16 lg:py-24 bg-stone-50/30">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-6">
          Try it now
        </h2>

        <p className="text-lg text-neutral-600 mb-4">
          <span className="font-semibold text-stone-700">
            14-day Pro trial.
          </span>{" "}
          Full features. No credit card.
        </p>

        <p className="text-neutral-600 mb-8">
          After that, choose: Free (local AI or BYOK), or Pro (managed cloud).
        </p>

        <DownloadButton />
      </div>
    </section>
  );
}
