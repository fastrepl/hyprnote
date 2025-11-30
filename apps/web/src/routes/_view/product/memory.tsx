import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/memory")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Memory Layer - Hyprnote" },
      {
        name: "description",
        content:
          "Hyprnote is your memory layer that connects all your meetings and conversations. The more you use it, the more it knows about you, your team, and your work.",
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
        <SuperConnectorSection />
        <SlashSeparator />
        <GrowingKnowledgeSection />
        <SlashSeparator />
        <ContextualIntelligenceSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6 flex items-center justify-center flex-wrap">
          <span>Your</span>
          <Icon
            icon="mdi:brain"
            className="w-12 h-12 sm:w-16 sm:h-16 inline-block mx-2 text-stone-500"
          />
          <span>memory layer</span>
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
          Hyprnote is a super connector that learns more about you with every
          meeting. It builds a living memory of your conversations,
          relationships, and decisions.
        </p>
        <div className="mt-8">
          <a
            href="https://hyprnote.com/download"
            className={cn([
              "inline-block px-8 py-3 text-base font-medium rounded-full",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white",
              "hover:scale-105 active:scale-95 transition-transform",
            ])}
          >
            Download for free
          </a>
        </div>
      </header>
    </div>
  );
}

function SuperConnectorSection() {
  return (
    <section className="relative">
      <div
        id="super-connector"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Super connector
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon
              icon="mdi:link-variant"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Connect every conversation
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Hyprnote links your meetings together, creating a web of knowledge
              that grows with every conversation. References to past
              discussions, people, and decisions are automatically connected.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Automatic linking between related meetings
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Track topics and themes across conversations
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Build a searchable history of all discussions
                </span>
              </li>
            </ul>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon
              icon="mdi:account-group"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Remember everyone you meet
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Never forget a name or context again. Hyprnote builds profiles of
              the people you interact with, remembering what you discussed,
              decisions made, and action items assigned.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Automatic participant tracking
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Conversation history per person
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Quick context before any meeting
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function GrowingKnowledgeSection() {
  return (
    <section className="relative">
      <div
        id="growing-knowledge"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Growing knowledge
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon
              icon="mdi:trending-up"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Gets smarter with every meeting
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              The more meetings you have, the more valuable Hyprnote becomes. It
              learns your preferences, understands your projects, and builds
              context that makes every interaction more meaningful.
            </p>
            <div className="space-y-3">
              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 font-medium mb-1">
                  After 10 meetings
                </p>
                <p className="text-xs text-neutral-500">
                  Understands your meeting patterns and key contacts
                </p>
              </div>
              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 font-medium mb-1">
                  After 50 meetings
                </p>
                <p className="text-xs text-neutral-500">
                  Knows your projects, teams, and recurring topics
                </p>
              </div>
              <div className="p-4 bg-stone-50 border border-neutral-200 rounded-lg">
                <p className="text-sm text-neutral-700 font-medium mb-1">
                  After 100+ meetings
                </p>
                <p className="text-xs text-neutral-500">
                  Becomes your complete professional memory
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon icon="mdi:history" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Never lose context again
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Remember that conversation from three months ago? Hyprnote does.
              Search through your entire meeting history with natural language
              and find exactly what you need.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "What did we decide about the pricing model?"
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "When did Sarah mention the Q4 deadline?"
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "Show me all discussions about the mobile app"
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  "What action items are pending with the design team?"
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContextualIntelligenceSection() {
  return (
    <section className="relative">
      <div
        id="contextual-intelligence"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Contextual intelligence
      </div>

      <div className="border-t border-neutral-100">
        <div className="p-8">
          <div className="max-w-3xl mx-auto">
            <Icon
              icon="mdi:lightbulb-on"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              AI that understands your world
            </h3>
            <p className="text-neutral-600 mb-6 leading-relaxed">
              Unlike generic AI assistants, Hyprnote's AI has context about your
              specific work, relationships, and history. This means more
              relevant suggestions, better summaries, and insights that actually
              matter to you.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:calendar-check"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  Meeting prep
                </h5>
                <p className="text-sm text-neutral-600">
                  Get briefings based on your history with attendees and related
                  past discussions
                </p>
              </div>

              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:file-document-edit"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  Smart summaries
                </h5>
                <p className="text-sm text-neutral-600">
                  Summaries that reference past decisions and highlight what's
                  new or changed
                </p>
              </div>

              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <Icon
                  icon="mdi:connection"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h5 className="font-medium text-stone-700 mb-2">
                  Relationship insights
                </h5>
                <p className="text-sm text-neutral-600">
                  Understand your network and how conversations connect across
                  your work
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-neutral-100">
          <div className="max-w-3xl mx-auto">
            <Icon
              icon="mdi:shield-lock"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Your memory, your control
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              All your meeting data stays on your device with local-first
              processing. Your memory layer is private by default, with optional
              cloud sync only when you choose. You own your data completely.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 lg:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
          <img
            src="/api/images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Start building your memory layer
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Every meeting adds to your knowledge. The sooner you start, the more
          valuable your memory becomes.
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="https://hyprnote.com/download"
            className={cn([
              "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
              "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
              "transition-all",
            ])}
          >
            Download for free
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </a>
          <Link
            to="/product/ai-assistant"
            className={cn([
              "px-6 h-12 flex items-center justify-center text-base sm:text-lg",
              "border border-neutral-300 text-stone-600 rounded-full",
              "hover:bg-white transition-colors",
            ])}
          >
            Learn about AI Assistant
          </Link>
        </div>
      </div>
    </section>
  );
}
