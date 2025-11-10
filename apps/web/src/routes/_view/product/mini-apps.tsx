import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

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
  const miniApps = [
    {
      icon: "mdi:account-multiple",
      title: "Contacts",
      description: "Automatic relationship tracking and conversation history",
      color: "blue",
      features: [
        "Auto-detected contacts from meetings",
        "Conversation timeline and history",
        "Topic tracking and context",
        "Before-meeting preparation",
      ],
    },
    {
      icon: "mdi:calendar",
      title: "Calendar",
      description: "Your calendar supercharged with meeting intelligence",
      color: "green",
      features: [
        "Automatic meeting linking",
        "Pre-meeting context and preparation",
        "Timeline view with notes",
        "Smart notifications",
      ],
    },
    {
      icon: "mdi:calendar-today",
      title: "Daily Notes",
      description: "Automatic daily summaries of all your meetings and tasks",
      color: "orange",
      features: [
        "Automatic aggregation of meetings",
        "Chronological timeline view",
        "Unified action items",
        "AI-generated daily summary",
      ],
      badge: "Coming Soon",
    },
    {
      icon: "mdi:notebook",
      title: "Noteshelf",
      description: "Personal workspace for notes, ideas, and knowledge base",
      color: "purple",
      features: [
        "Personal notes and reflections",
        "Knowledge base organization",
        "Link notes to meetings",
        "Full-text search across all notes",
      ],
      badge: "Coming Soon",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        icon: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-700",
      },
      green: {
        icon: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
        badge: "bg-green-100 text-green-700",
      },
      orange: {
        icon: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        badge: "bg-orange-100 text-orange-700",
      },
      purple: {
        icon: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        badge: "bg-purple-100 text-purple-700",
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
          <header className="mb-12 text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
              Built-in mini apps for everything
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Hyprnote includes powerful mini apps for managing contacts, calendar, daily notes, and your personal
              knowledge base. Everything works together seamlessly.
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

        <SlashSeparator />

        <div className="px-6 py-12 lg:py-20">
          <section className="mb-16">
            <div className="grid md:grid-cols-3 border-t border-neutral-100">
              <div className="p-6 text-left border-b md:border-b-0 md:border-r border-neutral-100">
                <h3 className="font-medium mb-1 text-neutral-900 font-mono">All-in-One</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Contacts, calendar, notes, and knowledge base in one place.
                </p>
              </div>
              <div className="p-6 text-left border-b md:border-b-0 md:border-r border-neutral-100">
                <h3 className="font-medium mb-1 text-neutral-900 font-mono">Auto-Connected</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Everything links automatically with your meetings and notes.
                </p>
              </div>
              <div className="p-6 text-left">
                <h3 className="font-medium mb-1 text-neutral-900 font-mono">Context-Rich</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Full conversation history and context at your fingertips.
                </p>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <div className="grid md:grid-cols-2 gap-8">
              {miniApps.map((app) => {
                const colors = getColorClasses(app.color);
                return (
                  <div
                    key={app.title}
                    className={cn(
                      "p-8 border-2 rounded-lg bg-white",
                      colors.border,
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <Icon icon={app.icon} className={cn("text-4xl", colors.icon)} />
                      {app.badge && (
                        <span className={cn("px-3 py-1 text-xs font-medium rounded-full", colors.badge)}>
                          {app.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-serif text-stone-600 mb-2">{app.title}</h3>
                    <p className="text-neutral-600 mb-6">{app.description}</p>
                    <ul className="space-y-2">
                      {app.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-neutral-600">
                          <Icon icon="mdi:check" className={cn("shrink-0 mt-0.5", colors.icon)} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              How they work together
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  1
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Connect calendar</h3>
                <p className="text-sm text-neutral-600">
                  Link your calendar to see upcoming meetings with full context and history.
                </p>
              </div>
              <div className="text-center p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  2
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Record meetings</h3>
                <p className="text-sm text-neutral-600">
                  Meetings auto-link to contacts, calendar events, and daily notes.
                </p>
              </div>
              <div className="text-center p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  3
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Stay organized</h3>
                <p className="text-sm text-neutral-600">
                  Everything connects automatically - notes, contacts, calendar, and knowledge base.
                </p>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Contacts</h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Automatically track who you meet with and what you discuss. Never forget a conversation.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-multiple" className="text-3xl text-blue-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Auto-detected contacts</h3>
                <p className="text-neutral-600">
                  Hyprnote identifies people from meeting participants and speaker identification, automatically
                  creating contact profiles.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:history" className="text-3xl text-blue-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Conversation timeline</h3>
                <p className="text-neutral-600">
                  See a chronological history of every meeting and conversation you've had with each person.
                </p>
              </div>
            </div>
            <div className="max-w-3xl mx-auto bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-blue-200 flex items-center justify-center">
                  <Icon icon="mdi:account" className="text-3xl text-blue-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-serif text-stone-600 mb-1">Sarah Johnson</h3>
                  <p className="text-sm text-neutral-600">Product Manager at Acme Inc</p>
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
                  <h4 className="text-sm font-medium text-stone-600 mb-2">Recent Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Q1 Planning</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Mobile App</span>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">User Research</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Calendar</h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Connect your calendar for intelligent meeting preparation and automatic note organization.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:calendar-sync" className="text-3xl text-green-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Automatic meeting linking</h3>
                <p className="text-neutral-600">
                  Recordings automatically associate with calendar events, creating a complete meeting record.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:history" className="text-3xl text-green-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Meeting preparation</h3>
                <p className="text-neutral-600">
                  Before meetings, see notes and action items from previous conversations with the same attendees.
                </p>
              </div>
            </div>
            <div className="max-w-4xl mx-auto bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-4">
                <Icon icon="mdi:calendar" className="text-2xl text-green-700 shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-serif text-stone-600 mb-1">Weekly Team Sync</h3>
                  <p className="text-sm text-neutral-600">Today at 10:00 AM · 30 minutes</p>
                </div>
                <button className="px-3 py-1 text-xs bg-red-600 text-white rounded-full">Start Recording</button>
              </div>
              <div className="space-y-3 ml-9">
                <div>
                  <h4 className="text-sm font-medium text-stone-600 mb-2">Last meeting context</h4>
                  <div className="p-3 bg-white border border-green-300 rounded text-xs">
                    <div className="font-medium text-green-900 mb-1">Jan 8, 2025 - Weekly Team Sync</div>
                    <p className="text-green-800">
                      Discussed Q1 roadmap, decided to prioritize mobile app. Sarah to review designs by Jan 15.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Daily Notes</h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-sm text-orange-700 mb-6 mx-auto justify-center w-full">
              <Icon icon="mdi:hammer-wrench" className="text-base" />
              <span>Coming Soon</span>
            </div>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Automatic daily summaries that consolidate all your meetings, action items, and insights.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:calendar-today" className="text-3xl text-orange-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Automatic aggregation</h3>
                <p className="text-neutral-600">
                  All meetings, notes, and action items from a single day automatically appear in your daily note.
                </p>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:chart-box" className="text-3xl text-orange-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Daily summary</h3>
                <p className="text-neutral-600">
                  AI-generated overview highlighting the most important moments and decisions of your day.
                </p>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Noteshelf</h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-sm text-purple-700 mb-6 mx-auto justify-center w-full">
              <Icon icon="mdi:hammer-wrench" className="text-base" />
              <span>Coming Soon</span>
            </div>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Your personal knowledge base for notes, ideas, and reflections alongside your meetings.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:note-text" className="text-2xl text-purple-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Personal notes</h3>
                <p className="text-sm text-neutral-600">
                  Write and organize your thoughts separate from meeting transcripts.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:link-variant" className="text-2xl text-purple-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Link to meetings</h3>
                <p className="text-sm text-neutral-600">
                  Connect notes to specific meetings or contacts for easy reference.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:folder-multiple" className="text-2xl text-purple-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Organize freely</h3>
                <p className="text-sm text-neutral-600">
                  Use folders, tags, and collections to structure your knowledge base.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:magnify" className="text-2xl text-purple-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Full-text search</h3>
                <p className="text-sm text-neutral-600">
                  Search across all notes and meeting transcripts in one place.
                </p>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <div className="p-8 bg-green-50 border-2 border-green-200 rounded-lg text-center">
              <Icon icon="mdi:shield-check" className="text-4xl text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-serif text-stone-600 mb-3">
                Everything stays local
              </h3>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                All mini apps work entirely on your device. Your contacts, calendar integration, notes, and data never
                leave your computer.
              </p>
            </div>
          </section>
        </div>

        <SlashSeparator />

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
              Download Hyprnote to start using contacts and calendar integration today. Daily notes and noteshelf coming
              soon
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
      </div>
    </div>
  );
}
