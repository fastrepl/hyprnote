import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/mini-apps")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Mini Apps - Hyprnote" },
      {
        name: "description",
        content:
          "Built-in mini apps for contacts, calendar, daily notes, and noteshelf. Everything you need to stay organized alongside your meetings.",
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
        <ContactsSection />
        <SlashSeparator />
        <CalendarSection />
        <SlashSeparator />
        <DailyNotesSection />
        <SlashSeparator />
        <NoteshelfSection />
        <SlashSeparator />
        <AdvancedSearchSection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="mb-12 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          Everything in one place
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Built-in mini apps for contacts, calendar, daily notes, and your
          personal knowledge base.
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

function ContactsSection() {
  return (
    <section className="bg-stone-50/30 relative">
      <div
        id="contacts"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-600">Contacts</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Track who you meet with and what you discuss. Never forget a
              conversation.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Auto-detected contacts from meetings
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Conversation timeline and history
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Topic tracking and context
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-8 bg-stone-50 overflow-hidden">
          <div className="max-w-md w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                <Icon icon="mdi:account" className="text-3xl text-stone-700" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-serif text-stone-600 mb-1">
                  Sarah Johnson
                </h4>
                <p className="text-sm text-neutral-600">
                  Product Manager at Acme Inc
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:calendar" />
                    12 meetings
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:clock" />
                    Last met: 2 days ago
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-stone-600 mb-2">
                  Recent Topics
                </h5>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-stone-100 text-stone-700 rounded">
                    Q1 Planning
                  </span>
                  <span className="px-2 py-1 text-xs bg-stone-100 text-stone-700 rounded">
                    Mobile App
                  </span>
                  <span className="px-2 py-1 text-xs bg-stone-100 text-stone-700 rounded">
                    User Research
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-600 mb-3">Contacts</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Track who you meet with and what you discuss. Never forget a
            conversation.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Auto-detected contacts from meetings
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Conversation timeline and history
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Topic tracking and context
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50 overflow-clip">
          <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                <Icon icon="mdi:account" className="text-3xl text-stone-700" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-serif text-stone-600 mb-1">
                  Sarah Johnson
                </h4>
                <p className="text-sm text-neutral-600">
                  Product Manager at Acme Inc
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:calendar" />
                    12 meetings
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:clock" />
                    Last met: 2 days ago
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-stone-600 mb-2">
                  Recent Topics
                </h5>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-stone-100 text-stone-700 rounded">
                    Q1 Planning
                  </span>
                  <span className="px-2 py-1 text-xs bg-stone-100 text-stone-700 rounded">
                    Mobile App
                  </span>
                  <span className="px-2 py-1 text-xs bg-stone-100 text-stone-700 rounded">
                    User Research
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarSection() {
  return (
    <section className="bg-stone-50/30 relative">
      <div
        id="calendar"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-600">Calendar</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Connect your calendar for intelligent meeting preparation and
              automatic note organization.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Automatic meeting linking
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Pre-meeting context and preparation
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Timeline view with notes
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-8 bg-stone-50 overflow-hidden">
          <div className="max-w-lg w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <Icon
                icon="mdi:calendar"
                className="text-2xl text-stone-700 shrink-0 mt-1"
              />
              <div className="flex-1">
                <h4 className="text-lg font-serif text-stone-600 mb-1">
                  Weekly Team Sync
                </h4>
                <p className="text-sm text-neutral-600">
                  Today at 10:00 AM · 30 minutes
                </p>
              </div>
              <button className="px-3 py-1 text-xs bg-stone-600 text-white rounded-full">
                Start Recording
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-stone-600 mb-2">
                  Last meeting context
                </h5>
                <div className="p-3 bg-stone-50 border border-stone-300 rounded text-xs">
                  <div className="font-medium text-stone-900 mb-1">
                    Jan 8, 2025 - Weekly Team Sync
                  </div>
                  <p className="text-stone-800">
                    Discussed Q1 roadmap, decided to prioritize mobile app.
                    Sarah to review designs by Jan 15.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-600 mb-3">Calendar</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Connect your calendar for intelligent meeting preparation and
            automatic note organization.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Automatic meeting linking
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Pre-meeting context and preparation
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Timeline view with notes
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50 overflow-clip">
          <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <Icon
                icon="mdi:calendar"
                className="text-2xl text-stone-700 shrink-0 mt-1"
              />
              <div className="flex-1">
                <h4 className="text-lg font-serif text-stone-600 mb-1">
                  Weekly Team Sync
                </h4>
                <p className="text-sm text-neutral-600">
                  Today at 10:00 AM · 30 minutes
                </p>
              </div>
              <button className="px-3 py-1 text-xs bg-stone-600 text-white rounded-full shrink-0">
                Start Recording
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-stone-600 mb-2">
                  Last meeting context
                </h5>
                <div className="p-3 bg-stone-50 border border-stone-300 rounded text-xs">
                  <div className="font-medium text-stone-900 mb-1">
                    Jan 8, 2025 - Weekly Team Sync
                  </div>
                  <p className="text-stone-800">
                    Discussed Q1 roadmap, decided to prioritize mobile app.
                    Sarah to review designs by Jan 15.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DailyNotesSection() {
  return (
    <section className="bg-stone-50/30 relative">
      <div
        id="daily-notes"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-600">Daily Notes</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Consolidate all your meetings, action items, and insights in one
              place.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Automatic aggregation of meetings
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Chronological timeline view
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  AI-generated daily summary
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-8 bg-stone-50 overflow-hidden">
          <div className="max-w-lg w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <p className="text-neutral-600 text-center italic">Coming soon</p>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-600 mb-3">
            Daily Notes
          </h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Consolidate all your meetings, action items, and insights in one
            place.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Automatic aggregation of meetings
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Chronological timeline view
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                AI-generated daily summary
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50 overflow-clip">
          <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <p className="text-neutral-600 text-center italic">Coming soon</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoteshelfSection() {
  return (
    <section className="bg-stone-50/30 relative">
      <div
        id="noteshelf"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div className="hidden sm:grid sm:grid-cols-2">
        <div className="flex items-center p-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-serif text-stone-600">Noteshelf</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Your workspace for notes, ideas, and reflections alongside your
              meetings.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Personal notes and reflections
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">Link notes to meetings</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon
                  icon="mdi:check-circle"
                  className="text-stone-600 shrink-0 mt-0.5 text-xl"
                />
                <span className="text-neutral-600">
                  Full-text search across all notes
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center px-8 py-8 bg-stone-50 overflow-hidden">
          <div className="max-w-lg w-full bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <p className="text-neutral-600 text-center italic">Coming soon</p>
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <div className="p-6 border-b border-neutral-100">
          <h2 className="text-2xl font-serif text-stone-600 mb-3">Noteshelf</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
            Your workspace for notes, ideas, and reflections alongside your
            meetings.
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Personal notes and reflections
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Link notes to meetings
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Icon
                icon="mdi:check-circle"
                className="text-stone-600 shrink-0 mt-0.5 text-xl"
              />
              <span className="text-neutral-600 text-sm">
                Full-text search across all notes
              </span>
            </li>
          </ul>
        </div>
        <div className="px-6 pb-0 bg-stone-50 overflow-clip">
          <div className="bg-white border-2 border-stone-200 rounded-lg p-6 shadow-lg">
            <p className="text-neutral-600 text-center italic">Coming soon</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdvancedSearchSection() {
  const [selectedImage, setSelectedImage] = useState(1);

  const images = [
    {
      id: 1,
      url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/search-1.jpg",
      title: "Suggestions",
      description:
        "Get instant search result suggestions based on recent activities",
    },
    {
      id: 2,
      url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/search-2.jpg",
      title: "Semantic search",
      description: "Find relevant info even without exact keywords",
    },
    {
      id: 3,
      url: "https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/search-3.jpg",
      title: "Filters",
      description: "Filter out result types easily",
    },
  ];

  return (
    <section className="bg-stone-50/30 relative">
      <div
        id="advanced-search"
        className="absolute top-[-69px] h-[69px] pointer-events-none"
      />
      <div>
        <div className="text-center">
          <div className="py-12 px-6">
            <div className="inline-block px-4 py-1.5 rounded-full bg-linear-to-t from-stone-600 to-stone-500 text-white opacity-50 text-xs font-medium mb-4">
              Coming Soon
            </div>
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Advanced Search
            </h2>
            <p className="text-base text-neutral-600">
              Complex queries with boolean operators and custom filters
            </p>
          </div>

          <div className="grid md:grid-cols-3 border-y border-neutral-100">
            {images.map((image, index) => (
              <button
                key={image.id}
                className={cn([
                  "text-center cursor-pointer transition-colors",
                  index < images.length - 1 && "border-r border-neutral-100",
                  selectedImage === image.id && "bg-stone-50",
                ])}
                onClick={() => setSelectedImage(image.id)}
              >
                <div className="p-6">
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    {image.title}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {image.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <img
            src={images.find((img) => img.id === selectedImage)?.url}
            alt="Advanced search interface"
            className="w-full h-auto object-cover"
          />
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
            src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
            alt="Hyprnote"
            width={144}
            height={144}
            className="size-36 mx-auto rounded-[40px] border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif">
          Get the complete experience
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Download Hyprnote to start using contacts and calendar integration
          today. Daily notes and noteshelf coming soon
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
        </div>
      </div>
    </section>
  );
}
