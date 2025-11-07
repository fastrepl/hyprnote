import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/contacts")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Contact Management - Hyprnote" },
      {
        name: "description",
        content:
          "Automatically track who you meet with and what you discuss. Hyprnote builds a living database of your professional relationships.",
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
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Remember every
              <br />
              conversation
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote automatically builds a database of everyone you meet with, tracking conversation history,
              discussion topics, and relationship context. Never forget what you talked about.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Automatic relationship tracking</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-multiple" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Auto-detected contacts</h3>
                <p className="text-neutral-600">
                  Hyprnote identifies people from meeting participants and speaker identification, automatically
                  creating contact profiles.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:history" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Conversation timeline</h3>
                <p className="text-neutral-600">
                  See a chronological history of every meeting and conversation you've had with each person.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:tag-multiple" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Topic tracking</h3>
                <p className="text-neutral-600">
                  AI automatically tags discussion topics, making it easy to see what you've covered with each contact.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:lightbulb" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Context at a glance</h3>
                <p className="text-neutral-600">
                  Before meetings, quickly review past conversations and action items with that person.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Contact profile overview
            </h2>
            <div className="max-w-3xl mx-auto bg-white border-2 border-neutral-200 rounded-lg p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center">
                  <Icon icon="mdi:account" className="text-3xl text-stone-600" />
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

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-stone-600 mb-2">Recent Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Q1 Planning</span>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Mobile App</span>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">User Research</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-stone-600 mb-2">Recent Conversations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 bg-neutral-50 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-neutral-700">Product Roadmap Review</span>
                        <span className="text-xs text-neutral-500">Jan 15, 2025</span>
                      </div>
                      <p className="text-xs text-neutral-600">Discussed Q1 priorities and mobile app timeline...</p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-neutral-700">Weekly Sync</span>
                        <span className="text-xs text-neutral-500">Jan 8, 2025</span>
                      </div>
                      <p className="text-xs text-neutral-600">Status update on user research findings...</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-stone-600 mb-2">Outstanding Action Items</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Icon icon="mdi:checkbox-blank-outline" className="text-neutral-400" />
                      <span>Follow up on design mockups</span>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-600">
                      <Icon icon="mdi:checkbox-blank-outline" className="text-neutral-400" />
                      <span>Schedule user testing session</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Perfect for</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:handshake" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Client relationships</h3>
                <p className="text-sm text-neutral-600">
                  Track what each client cares about, their preferences, and past discussions.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-tie" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Sales & partnerships</h3>
                <p className="text-sm text-neutral-600">
                  Remember details about prospects, their pain points, and follow-up items.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-group" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Team collaboration</h3>
                <p className="text-sm text-neutral-600">
                  Keep track of 1:1s, feedback sessions, and ongoing projects with teammates.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:briefcase" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Stakeholder management</h3>
                <p className="text-sm text-neutral-600">
                  Maintain context on what matters to each stakeholder and decision maker.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:school" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Mentorship</h3>
                <p className="text-sm text-neutral-600">
                  Track advice given, progress discussed, and goals for each mentee.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:network" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Professional networking</h3>
                <p className="text-sm text-neutral-600">
                  Remember conversations with industry contacts and potential collaborators.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Smart features</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon icon="mdi:magnify" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Quick search</h3>
                  <p className="text-neutral-600">
                    Find any contact or conversation instantly with full-text search across all your notes.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:filter" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Smart filters</h3>
                  <p className="text-neutral-600">
                    Filter contacts by company, role, recent activity, or custom tags.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:bell" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Follow-up reminders</h3>
                  <p className="text-neutral-600">
                    Get reminded about pending action items or when it's time to reconnect.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:file-export" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Export & integrate</h3>
                  <p className="text-neutral-600">
                    Export contact information and sync with your CRM or other tools.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Never lose relationship context
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Build stronger professional relationships by remembering every conversation, follow-up, and detail that
              matters.
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
                to="/product/calendar"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                Learn about calendar
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
