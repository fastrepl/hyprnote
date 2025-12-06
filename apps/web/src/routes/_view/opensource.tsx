import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { DownloadButton } from "@/components/download-button";
import { Image } from "@/components/image";
import { SlashSeparator } from "@/components/slash-separator";
import {
  GITHUB_LAST_SEEN_FORKS,
  GITHUB_LAST_SEEN_STARS,
  Stargazer,
  useGitHubStargazers,
  useGitHubStats,
} from "@/queries";

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
        <LetterSection />
        <SlashSeparator />
        <TechStackSection />
        <SlashSeparator />
        <ProgressSection />
        <SlashSeparator />
        <JoinMovementSection />
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
      className="block size-14 rounded-sm overflow-hidden border border-neutral-200/50 bg-neutral-100 shrink-0 hover:scale-110 hover:border-neutral-400 hover:opacity-100 transition-all"
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
  const rows = 10;
  const cols = 20;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 flex flex-col justify-center gap-1 opacity-40 px-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 justify-center">
            {Array.from({ length: cols }).map((_, colIndex) => {
              const index = (rowIndex * cols + colIndex) % stargazers.length;
              const stargazer = stargazers[index];
              const delay = Math.random() * 3;

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
    </div>
  );
}

function HeroSection() {
  const { data: stargazers = [] } = useGitHubStargazers();

  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 relative overflow-hidden">
      {stargazers.length > 0 && <StargazersGrid stargazers={stargazers} />}
      <div className="px-6 py-12 lg:py-20 relative z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_800px_400px_at_50%_50%,white_0%,rgba(255,255,255,0.8)_40%,transparent_70%)] pointer-events-none" />
        <header className="mb-12 text-center max-w-4xl mx-auto relative">
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
                "inline-flex items-center justify-center gap-2 px-8 py-3 font-medium rounded-full",
                "bg-linear-to-t from-neutral-800 to-neutral-700 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              <Icon icon="mdi:github" className="text-lg" />
              View on GitHub
            </a>
            <DownloadButton />
          </div>
        </header>
      </div>
    </div>
  );
}

function LetterSection() {
  return (
    <section
      className="px-6 py-16 lg:py-24 relative"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgb(229 229 229 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgb(229 229 229 / 0.3) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <div className="max-w-3xl mx-auto relative z-10">
        <div className="mb-8 text-center">
          <span className="text-sm uppercase tracking-widest text-neutral-500 font-medium">
            A letter from our team
          </span>
        </div>

        <article className="prose prose-stone prose-lg max-w-none">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-600 text-center mb-12">
            Why Open Source is Inevitable
            <br />
            in the Age of AI
          </h1>

          <div className="space-y-6 text-neutral-700 leading-relaxed">
            <p className="text-lg">Dear friends,</p>

            <p>
              We are living through a profound shift in how software is built
              and how it shapes our lives. AI is no longer a distant promise—it
              is here, embedded in the tools we use every day, listening to our
              conversations, reading our documents, and learning from our most
              private moments.
            </p>

            <p>
              This is precisely why we believe open source is not just a
              preference—it is a necessity.
            </p>

            <p>
              When AI processes your voice, your meetings, your thoughts, you
              deserve to know exactly what happens to that data. You deserve to
              verify that your conversations stay private. You deserve to
              understand the algorithms that summarize your words and extract
              meaning from your discussions.
            </p>

            <p>
              Closed-source AI tools ask you to trust them blindly. They say
              "your data is safe" but offer no way to verify. They promise
              privacy but hide their code behind corporate walls. In an age
              where AI can understand and remember everything, this blind trust
              is no longer acceptable.
            </p>

            <p>
              Open source changes this equation fundamentally. When every line
              of code is visible, privacy claims become verifiable facts.
              Security researchers can audit. Developers can contribute.
              Communities can fork and improve. The software becomes accountable
              not to shareholders, but to users.
            </p>

            <p>
              We built Hyprnote as open source because we believe the future of
              AI must be transparent. We believe that as AI becomes more
              powerful, the need for openness becomes more urgent. We believe
              that the best way to earn trust is to make trust unnecessary—by
              showing everything.
            </p>

            <p>
              This is not idealism. This is pragmatism. Open source projects
              outlive companies. Open source code can be audited, forked, and
              improved by anyone. Open source creates a foundation that belongs
              to everyone, not just those who control the servers.
            </p>

            <p>
              The age of AI demands a new social contract between software and
              its users. We believe that contract must be written in open
              source.
            </p>

            <p className="mt-8">
              With conviction,
              <br />
              <span className="font-medium text-stone-600">
                The Hyprnote Team
              </span>
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

const techStack = [
  {
    name: "Rust",
    icon: "mdi:language-rust",
    description: "Core audio processing and local AI inference",
    url: "https://www.rust-lang.org/",
  },
  {
    name: "Tauri",
    icon: "simple-icons:tauri",
    description: "Cross-platform desktop framework",
    url: "https://tauri.app/",
  },
  {
    name: "React",
    icon: "mdi:react",
    description: "User interface and frontend",
    url: "https://react.dev/",
  },
  {
    name: "Whisper",
    icon: "mdi:microphone",
    description: "Local speech-to-text transcription",
    url: "https://github.com/openai/whisper",
  },
  {
    name: "llama.cpp",
    icon: "mdi:brain",
    description: "Local LLM inference engine",
    url: "https://github.com/ggerganov/llama.cpp",
  },
  {
    name: "SQLite",
    icon: "mdi:database",
    description: "Local-first data storage",
    url: "https://www.sqlite.org/",
  },
];

const sponsors = [
  {
    name: "Tauri",
    icon: "simple-icons:tauri",
    url: "https://tauri.app/",
    description: "Desktop framework",
  },
  {
    name: "llama.cpp",
    icon: "mdi:brain",
    url: "https://github.com/ggerganov/llama.cpp",
    description: "LLM inference",
  },
  {
    name: "whisper.cpp",
    icon: "mdi:microphone",
    url: "https://github.com/ggerganov/whisper.cpp",
    description: "Speech recognition",
  },
];

function TechStackSection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
          Our Tech Stack
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Built with modern, privacy-respecting technologies that run locally on
          your device.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {techStack.map((tech) => (
            <a
              key={tech.name}
              href={tech.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn([
                "p-6 border border-neutral-200 rounded-lg bg-white",
                "hover:border-stone-400 hover:shadow-sm transition-all",
                "group",
              ])}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon
                  icon={tech.icon}
                  className="text-2xl text-stone-600 group-hover:text-stone-800 transition-colors"
                />
                <h3 className="font-medium text-stone-600 group-hover:text-stone-800 transition-colors">
                  {tech.name}
                </h3>
              </div>
              <p className="text-sm text-neutral-600">{tech.description}</p>
            </a>
          ))}
        </div>

        <div className="border-t border-neutral-200 pt-12">
          <h3 className="text-2xl font-serif text-stone-600 mb-4 text-center">
            Projects We Sponsor
          </h3>
          <p className="text-neutral-600 text-center mb-8 max-w-2xl mx-auto">
            We believe in giving back to the open source community that makes
            our work possible.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {sponsors.map((sponsor) => (
              <a
                key={sponsor.name}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "flex items-center gap-3 px-6 py-4",
                  "border border-neutral-200 rounded-lg bg-white",
                  "hover:border-stone-400 hover:shadow-sm transition-all",
                ])}
              >
                <Icon icon={sponsor.icon} className="text-2xl text-stone-600" />
                <div>
                  <p className="font-medium text-stone-600">{sponsor.name}</p>
                  <p className="text-xs text-neutral-500">
                    {sponsor.description}
                  </p>
                </div>
              </a>
            ))}
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
            <h4 className="text-xl font-serif text-stone-600 mb-3">
              Sponsor Hyprnote
            </h4>
            <p className="text-neutral-600 mb-6 max-w-xl mx-auto">
              Your sponsorship helps us maintain and improve Hyprnote, keeping
              it free and open source for everyone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/sponsors/fastrepl"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-full",
                  "bg-gradient-to-t from-neutral-800 to-neutral-700 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                <Icon icon="mdi:heart" className="text-lg" />
                Sponsor on GitHub
              </a>
              <a
                href="https://opencollective.com/hyprnote"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                <Icon icon="mdi:hand-coin" className="text-lg" />
                Open Collective
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressSection() {
  const { stars, forks } = useGitHubStats();

  const stats = [
    {
      label: "GitHub Stars",
      value: stars?.toLocaleString() ?? GITHUB_LAST_SEEN_STARS.toLocaleString(),
      icon: "mdi:star",
      color: "text-yellow-500",
    },
    {
      label: "Forks",
      value: forks?.toLocaleString() ?? GITHUB_LAST_SEEN_FORKS.toLocaleString(),
      icon: "mdi:source-fork",
      color: "text-blue-500",
    },
    {
      label: "Contributors",
      value: "50+",
      icon: "mdi:account-group",
      color: "text-green-500",
    },
    {
      label: "Countries",
      value: "30+",
      icon: "mdi:earth",
      color: "text-purple-500",
    },
  ];

  const milestones = [
    { date: "Jan 2024", event: "First Commit", icon: "mdi:rocket-launch" },
    { date: "Mar 2024", event: "Public Beta", icon: "mdi:party-popper" },
    { date: "Jun 2024", event: "1K Stars", icon: "mdi:star" },
    { date: "Sep 2024", event: "v1.0 Release", icon: "mdi:tag" },
    { date: "Dec 2024", event: "5K Stars", icon: "mdi:star-shooting" },
    { date: "2025", event: "10K Stars", icon: "mdi:trophy" },
  ];

  return (
    <section className="px-6 py-12 lg:py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
          How We're Doing
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Our progress is measured by the community we're building together.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="p-6 border border-neutral-200 rounded-lg bg-white text-center"
            >
              <Icon
                icon={stat.icon}
                className={cn(["text-3xl mb-2", stat.color])}
              />
              <p className="text-2xl font-bold text-stone-600">{stat.value}</p>
              <p className="text-sm text-neutral-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <h3 className="text-2xl font-serif text-stone-600 mb-8 text-center">
          Our Journey
        </h3>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-200 -translate-x-1/2 hidden md:block" />
          <div className="space-y-8 md:space-y-0">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.date}
                className={cn([
                  "relative md:flex md:items-center md:py-4",
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse",
                ])}
              >
                <div
                  className={cn([
                    "md:w-1/2",
                    index % 2 === 0 ? "md:pr-8" : "md:pl-8",
                  ])}
                >
                  <div
                    className={cn([
                      "p-4 border border-neutral-200 rounded-lg bg-white",
                      index % 2 === 0 ? "md:text-right" : "md:text-left",
                    ])}
                  >
                    <div
                      className={cn([
                        "flex items-center gap-2 mb-1",
                        index % 2 === 0 ? "md:justify-end" : "md:justify-start",
                      ])}
                    >
                      <Icon
                        icon={milestone.icon}
                        className="text-lg text-stone-500"
                      />
                      <span className="text-xs text-neutral-500">
                        {milestone.date}
                      </span>
                    </div>
                    <p className="font-medium text-stone-600">
                      {milestone.event}
                    </p>
                  </div>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-stone-600 rounded-full border-4 border-white hidden md:block" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid sm:grid-cols-3 gap-6">
          <div className="p-6 border border-neutral-200 rounded-lg bg-white text-center">
            <Icon
              icon="mdi:code-braces"
              className="text-3xl text-stone-600 mb-2"
            />
            <h4 className="font-medium text-stone-600 mb-1">
              Active Development
            </h4>
            <p className="text-sm text-neutral-500">
              New features and improvements every week
            </p>
          </div>
          <div className="p-6 border border-neutral-200 rounded-lg bg-white text-center">
            <Icon icon="mdi:bug" className="text-3xl text-stone-600 mb-2" />
            <h4 className="font-medium text-stone-600 mb-1">Quick Bug Fixes</h4>
            <p className="text-sm text-neutral-500">
              Most issues resolved within 48 hours
            </p>
          </div>
          <div className="p-6 border border-neutral-200 rounded-lg bg-white text-center">
            <Icon icon="mdi:update" className="text-3xl text-stone-600 mb-2" />
            <h4 className="font-medium text-stone-600 mb-1">
              Regular Releases
            </h4>
            <p className="text-sm text-neutral-500">
              New versions released every 2-3 weeks
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const contributions = [
  {
    title: "Star Repository",
    description: "Show your support and help others discover Hyprnote",
    icon: "mdi:star",
    link: "https://github.com/fastrepl/hyprnote",
    linkText: "Star on GitHub",
  },
  {
    title: "Contribute Code",
    description: "Fix bugs, add features, or improve documentation",
    icon: "mdi:code-braces",
    link: "https://github.com/fastrepl/hyprnote/contribute",
    linkText: "View Issues",
  },
  {
    title: "Report Issues",
    description: "Help us improve by reporting bugs and suggesting features",
    icon: "mdi:bug",
    link: "https://github.com/fastrepl/hyprnote/issues",
    linkText: "Open Issue",
  },
  {
    title: "Help Translate",
    description: "Make Hyprnote accessible in your language",
    icon: "mdi:translate",
    link: "https://github.com/fastrepl/hyprnote",
    linkText: "Contribute Translations",
  },
  {
    title: "Spread the Word",
    description: "Share Hyprnote with your network and community",
    icon: "mdi:share-variant",
    link: "https://twitter.com/intent/tweet?text=Check%20out%20Hyprnote%20-%20open%20source%20AI%20meeting%20notes%20that%20run%20locally!%20https://hyprnote.com",
    linkText: "Share on X",
  },
  {
    title: "Join Community",
    description: "Connect with other users and contributors",
    icon: "mdi:forum",
    link: "https://discord.gg/Hyprnote",
    linkText: "Join Discord",
  },
];

function JoinMovementSection() {
  return (
    <section className="px-6 py-12 lg:py-16 bg-stone-50/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
          Be Part of the Movement
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Every contribution, no matter how small, helps build a more private
          future for AI.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {contributions.map((item) => (
            <div
              key={item.title}
              className="p-6 border border-neutral-200 rounded-lg bg-white"
            >
              <Icon icon={item.icon} className="text-2xl text-stone-600 mb-3" />
              <h3 className="font-medium text-stone-600 mb-2">{item.title}</h3>
              <p className="text-sm text-neutral-600 mb-4">
                {item.description}
              </p>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors"
              >
                {item.linkText} →
              </a>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-6">
          <a
            href="https://github.com/fastrepl/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 border border-neutral-200 rounded-full bg-white hover:border-stone-400 transition-colors"
          >
            <Icon icon="mdi:github" className="text-2xl text-stone-600" />
          </a>
          <a
            href="https://discord.gg/Hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 border border-neutral-200 rounded-full bg-white hover:border-stone-400 transition-colors"
          >
            <Icon icon="mdi:discord" className="text-2xl text-stone-600" />
          </a>
          <a
            href="https://twitter.com/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 border border-neutral-200 rounded-full bg-white hover:border-stone-400 transition-colors"
          >
            <Icon icon="mdi:twitter" className="text-2xl text-stone-600" />
          </a>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-16 lg:py-24">
      <div className="max-w-2xl mx-auto text-center">
        <Image
          src="/icon.png"
          alt="Hyprnote icon"
          className="w-16 h-16 mx-auto mb-6"
        />
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-600 mb-4">
          Privacy you can verify
        </h2>
        <p className="text-neutral-600 mb-8 max-w-xl mx-auto">
          Join thousands of users who trust Hyprnote for their most important
          conversations. Open source, local-first, and built for privacy.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <DownloadButton />
          <a
            href="https://github.com/fastrepl/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className={cn([
              "inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-full",
              "border border-neutral-300 text-stone-600",
              "hover:bg-stone-50 transition-colors",
            ])}
          >
            <Icon icon="mdi:github" className="text-lg" />
            View Source Code
          </a>
        </div>
      </div>
    </section>
  );
}
