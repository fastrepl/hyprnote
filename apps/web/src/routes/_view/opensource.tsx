import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { GitHubOpenSource } from "@/components/github-open-source";
import { SlashSeparator } from "@/components/slash-separator";
import { Stargazer, useGitHubStargazers } from "@/queries";

export const Route = createFileRoute("/_view/opensource")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Open Source - Hyprnote" },
      {
        name: "description",
        content:
          "Hyprnote is fully open source under GPL-3.0. Inspect every line of code, contribute to development, and build on a transparent foundation. No black boxes, no hidden data collection.",
      },
      { property: "og:title", content: "Open Source - Hyprnote" },
      {
        property: "og:description",
        content:
          "AI-powered meeting notes built in the open. Fully auditable codebase, community-driven development, and complete transparency. Join thousands of developers building the future of private meeting notes.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/opensource",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Open Source - Hyprnote" },
      {
        name: "twitter:description",
        content:
          "AI-powered meeting notes built in the open. Fully auditable codebase and community-driven development.",
      },
      {
        name: "keywords",
        content:
          "open source, meeting notes, AI transcription, privacy, GPL-3.0, Rust, Tauri, local AI, whisper, llm",
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
        <WhyOpenSourceSection />
        <SlashSeparator />
        <GitHubOpenSource />
        <SlashSeparator />
        <TransparencySection />
        <SlashSeparator />
        <TechStackSection />
        <SlashSeparator />
        <ContributeSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function StargazerAvatar({ stargazer }: { stargazer: Stargazer }) {
  return (
    <a
      href={`https://github.com/${stargazer.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block size-8 rounded-sm overflow-hidden border border-neutral-200/50 bg-neutral-100 shrink-0 hover:scale-110 hover:border-neutral-400 hover:opacity-100 transition-all"
    >
      <img
        src={stargazer.avatar}
        alt={`${stargazer.username}'s avatar`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </a>
  );
}

function StargazersGrid({ stargazers }: { stargazers: Stargazer[] }) {
  const rows = 16;
  const cols = 32;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 flex flex-col justify-center gap-1 opacity-40 px-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 justify-center">
            {Array.from({ length: cols }).map((_, colIndex) => {
              const index = (rowIndex * cols + colIndex) % stargazers.length;
              const stargazer = stargazers[index];
              const delay = (rowIndex * cols + colIndex) * 0.05;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="pointer-events-auto animate-fade-in-out"
                  style={{
                    animationDelay: `${delay}s`,
                    animationDuration: "3s",
                  }}
                >
                  <StargazerAvatar stargazer={stargazer} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white" />
    </div>
  );
}

function HeroSection() {
  const { data: stargazers = [] } = useGitHubStargazers(500);

  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 relative overflow-hidden">
      {stargazers.length > 0 && <StargazersGrid stargazers={stargazers} />}
      <div className="px-6 py-12 lg:py-20 relative z-10">
        <header className="mb-12 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
            Built in the open,
            <br />
            for everyone
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
            Hyprnote is fully open source under GPL-3.0. Every line of code is
            auditable, every decision is transparent, and every user has the
            freedom to inspect, modify, and contribute.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://github.com/fastrepl/hyprnote"
              target="_blank"
              rel="noopener noreferrer"
              className={cn([
                "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-neutral-800 to-neutral-700 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              <Icon icon="mdi:github" className="text-lg" />
              View on GitHub
            </a>
            <a
              href="https://hyprnote.com/download"
              className={cn([
                "inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 shadow-sm",
                "hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all",
              ])}
            >
              Download for free
            </a>
          </div>
        </header>
      </div>
    </div>
  );
}

function WhyOpenSourceSection() {
  return (
    <section className="px-6 py-12 lg:py-16">
      <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
        Why open source matters
      </h2>
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <Icon
            icon="mdi:shield-check"
            className="text-3xl text-stone-600 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-600 mb-2">
            Verifiable privacy
          </h3>
          <p className="text-neutral-600">
            Don't just trust our privacy claims—verify them yourself. Every data
            flow, every API call, every storage operation is visible in the
            source code.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <Icon
            icon="mdi:account-group"
            className="text-3xl text-stone-600 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-600 mb-2">
            Community driven
          </h3>
          <p className="text-neutral-600">
            Features are shaped by real users, not just product managers. Report
            bugs, suggest improvements, or contribute code directly to make
            Hyprnote better for everyone.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <Icon icon="mdi:infinity" className="text-3xl text-stone-600 mb-4" />
          <h3 className="text-xl font-serif text-stone-600 mb-2">
            No vendor lock-in
          </h3>
          <p className="text-neutral-600">
            Your data, your rules. Fork the project, self-host it, or modify it
            to fit your exact needs. You're never trapped in a proprietary
            ecosystem.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <Icon icon="mdi:history" className="text-3xl text-stone-600 mb-4" />
          <h3 className="text-xl font-serif text-stone-600 mb-2">
            Long-term sustainability
          </h3>
          <p className="text-neutral-600">
            Open source projects outlive companies. Even if Hyprnote the company
            disappears, the software lives on through the community.
          </p>
        </div>
      </div>
    </section>
  );
}

function TransparencySection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
        Complete transparency
      </h2>
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <Icon
              icon="mdi:code-braces"
              className="text-4xl text-stone-600 mb-4 mx-auto"
            />
            <h3 className="font-medium text-stone-600 mb-2">
              Auditable codebase
            </h3>
            <p className="text-sm text-neutral-600">
              Every function, every algorithm, every data handler is open for
              inspection. Security researchers and privacy advocates can verify
              our claims.
            </p>
          </div>
          <div className="text-center p-6">
            <Icon
              icon="mdi:git"
              className="text-4xl text-stone-600 mb-4 mx-auto"
            />
            <h3 className="font-medium text-stone-600 mb-2">
              Public development
            </h3>
            <p className="text-sm text-neutral-600">
              All development happens in the open. Watch features being built,
              see how bugs are fixed, and understand the reasoning behind every
              change.
            </p>
          </div>
          <div className="text-center p-6">
            <Icon
              icon="mdi:file-document-outline"
              className="text-4xl text-stone-600 mb-4 mx-auto"
            />
            <h3 className="font-medium text-stone-600 mb-2">Clear licensing</h3>
            <p className="text-sm text-neutral-600">
              GPL-3.0 ensures the code stays open. Any modifications must also
              be open source, protecting the community's investment.
            </p>
          </div>
        </div>

        <div className="mt-12 p-8 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-start gap-4">
            <Icon
              icon="mdi:eye-outline"
              className="text-3xl text-stone-600 shrink-0"
            />
            <div>
              <h3 className="text-xl font-serif text-stone-600 mb-3">
                No hidden data collection
              </h3>
              <p className="text-neutral-600 mb-4">
                Unlike closed-source alternatives, you can verify exactly what
                data Hyprnote collects and where it goes. Our telemetry is
                opt-in, minimal, and fully documented in the source code.
              </p>
              <a
                href="https://github.com/fastrepl/hyprnote/blob/main/plugins/analytics/src/lib.rs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
              >
                <Icon icon="mdi:github" className="text-lg" />
                View analytics implementation
                <Icon icon="mdi:arrow-right" className="text-lg" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TechStackSection() {
  return (
    <section className="px-6 py-12 lg:py-16">
      <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
        Built with modern technology
      </h2>
      <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
        Hyprnote combines the best of systems programming and web technologies
        to deliver a fast, secure, and cross-platform experience.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-center gap-3 mb-3">
            <Icon
              icon="mdi:language-rust"
              className="text-2xl text-stone-600"
            />
            <h3 className="font-medium text-stone-600">Rust</h3>
          </div>
          <p className="text-sm text-neutral-600">
            Memory-safe systems programming for the core audio processing,
            transcription pipeline, and local AI inference.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-center gap-3 mb-3">
            <Icon
              icon="simple-icons:tauri"
              className="text-2xl text-stone-600"
            />
            <h3 className="font-medium text-stone-600">Tauri</h3>
          </div>
          <p className="text-sm text-neutral-600">
            Lightweight desktop framework that combines Rust backend with web
            frontend for native performance.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="mdi:react" className="text-2xl text-stone-600" />
            <h3 className="font-medium text-stone-600">React</h3>
          </div>
          <p className="text-sm text-neutral-600">
            Modern UI framework powering the desktop app interface with TanStack
            Router for navigation.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="mdi:microphone" className="text-2xl text-stone-600" />
            <h3 className="font-medium text-stone-600">Whisper</h3>
          </div>
          <p className="text-sm text-neutral-600">
            OpenAI's speech recognition model running locally for private,
            accurate transcription in 100+ languages.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="mdi:brain" className="text-2xl text-stone-600" />
            <h3 className="font-medium text-stone-600">Local LLMs</h3>
          </div>
          <p className="text-sm text-neutral-600">
            On-device language models for summarization and insights without
            sending data to external servers.
          </p>
        </div>
        <div className="p-6 border border-neutral-200 rounded-lg bg-white">
          <div className="flex items-center gap-3 mb-3">
            <Icon icon="mdi:database" className="text-2xl text-stone-600" />
            <h3 className="font-medium text-stone-600">SQLite</h3>
          </div>
          <p className="text-sm text-neutral-600">
            Local-first database via libsql for fast, reliable storage with
            optional cloud sync.
          </p>
        </div>
      </div>

      <div className="mt-12 text-center">
        <a
          href="https://github.com/fastrepl/hyprnote"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium"
        >
          <Icon icon="mdi:github" className="text-lg" />
          Explore the full architecture on GitHub
          <Icon icon="mdi:arrow-right" className="text-lg" />
        </a>
      </div>
    </section>
  );
}

function ContributeSection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
        Join the community
      </h2>

      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <Icon
              icon="mdi:source-pull"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              Contribute code
            </h3>
            <p className="text-neutral-600 mb-4">
              Whether it's fixing a bug, adding a feature, or improving
              documentation, every contribution makes Hyprnote better.
            </p>
            <a
              href="https://github.com/fastrepl/hyprnote/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium text-sm"
            >
              Read contributing guide
              <Icon icon="mdi:arrow-right" className="text-lg" />
            </a>
          </div>
          <div className="p-6 border border-neutral-200 rounded-lg bg-white">
            <Icon
              icon="mdi:bug-outline"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-2">
              Report issues
            </h3>
            <p className="text-neutral-600 mb-4">
              Found a bug or have a feature request? Open an issue on GitHub and
              help us prioritize what matters most to users.
            </p>
            <a
              href="https://github.com/fastrepl/hyprnote/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 font-medium text-sm"
            >
              View open issues
              <Icon icon="mdi:arrow-right" className="text-lg" />
            </a>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <a
            href="https://github.com/fastrepl/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg bg-white hover:border-stone-400 transition-colors"
          >
            <Icon icon="mdi:github" className="text-2xl text-stone-600" />
            <div>
              <p className="font-medium text-stone-600">GitHub</p>
              <p className="text-sm text-neutral-500">Star & fork</p>
            </div>
          </a>
          <a
            href="https://discord.gg/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg bg-white hover:border-stone-400 transition-colors"
          >
            <Icon icon="mdi:discord" className="text-2xl text-stone-600" />
            <div>
              <p className="font-medium text-stone-600">Discord</p>
              <p className="text-sm text-neutral-500">Join the chat</p>
            </div>
          </a>
          <a
            href="https://twitter.com/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg bg-white hover:border-stone-400 transition-colors"
          >
            <Icon icon="mdi:twitter" className="text-2xl text-stone-600" />
            <div>
              <p className="font-medium text-stone-600">Twitter</p>
              <p className="text-sm text-neutral-500">Follow updates</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-16 lg:py-20">
      <div className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center max-w-3xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Privacy you can verify
        </h2>
        <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
          Join thousands of users who trust Hyprnote because they can see
          exactly how it works. Download the app or explore the source code
          today.
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
            Download for free
          </a>
          <Link
            to="/product/local-ai"
            className={cn([
              "px-6 py-3 text-base font-medium rounded-full",
              "border border-neutral-300 text-stone-600",
              "hover:bg-stone-50 transition-colors",
            ])}
          >
            Learn about Local AI
          </Link>
        </div>
      </div>
    </section>
  );
}
