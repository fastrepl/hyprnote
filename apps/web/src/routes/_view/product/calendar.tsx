import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/calendar")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Calendar Integration - Hyprnote" },
      {
        name: "description",
        content:
          "Connect your calendar to Hyprnote for automatic meeting preparation and seamless note organization. See your schedule alongside conversation context.",
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
              Your calendar,
              <br />
              supercharged
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Connect Hyprnote to your calendar for intelligent meeting preparation, automatic note organization, and a
              unified view of your schedule with conversation context.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Calendar integration benefits</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:calendar-sync" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Automatic meeting linking</h3>
                <p className="text-neutral-600">
                  Your recordings are automatically associated with calendar events, creating a complete meeting record.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:history" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Meeting preparation</h3>
                <p className="text-neutral-600">
                  Before meetings, see notes and action items from previous conversations with the same attendees.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:chart-timeline" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Timeline view</h3>
                <p className="text-neutral-600">
                  Visualize your meetings and notes in a chronological calendar view for better context.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:bell-ring" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Smart notifications</h3>
                <p className="text-neutral-600">
                  Get reminded to start recording when meetings begin and to review notes afterward.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Seamless workflow
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  1
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Connect calendar</h3>
                <p className="text-sm text-neutral-600">
                  Link your Google Calendar, Outlook, or other calendar service
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  2
                </div>
                <h3 className="font-medium text-stone-600 mb-2">See context</h3>
                <p className="text-sm text-neutral-600">
                  View meeting agendas, attendees, and past conversations in one place
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  3
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Record & organize</h3>
                <p className="text-sm text-neutral-600">
                  Notes automatically link to calendar events for easy retrieval
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Pre-meeting intelligence</h2>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white border-2 border-neutral-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4 mb-4">
                  <Icon icon="mdi:calendar" className="text-2xl text-blue-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-serif text-stone-600 mb-1">Weekly Team Sync</h3>
                    <p className="text-sm text-neutral-600">Today at 10:00 AM · 30 minutes</p>
                  </div>
                  <button className="px-3 py-1 text-xs bg-red-600 text-white rounded-full">Start Recording</button>
                </div>

                <div className="space-y-4 ml-9">
                  <div>
                    <h4 className="text-sm font-medium text-stone-600 mb-2">Attendees (4)</h4>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded">Sarah Johnson</span>
                      <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded">Mike Chen</span>
                      <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded">+2 more</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-stone-600 mb-2">Last meeting context</h4>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="font-medium text-blue-900 mb-1">Jan 8, 2025 - Weekly Team Sync</div>
                      <p className="text-blue-800">
                        Discussed Q1 roadmap, decided to prioritize mobile app. Sarah to review designs by Jan 15.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-stone-600 mb-2">Open action items</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Icon icon="mdi:checkbox-blank-outline" className="text-neutral-400" />
                        <span>Sarah: Review design mockups (due today)</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Icon icon="mdi:checkbox-blank-outline" className="text-neutral-400" />
                        <span>Mike: Update sprint board (overdue)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-neutral-600">
                Get full context before every meeting - no more asking "what did we discuss last time?"
              </p>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Calendar view features</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon icon="mdi:magnify" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Search by date</h3>
                  <p className="text-neutral-600">
                    Jump to any date to see meetings and notes from that day in a unified timeline.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:filter" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Filter by type</h3>
                  <p className="text-neutral-600">
                    Show only 1:1s, team meetings, client calls, or other custom categories.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:account-group" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Filter by attendee</h3>
                  <p className="text-neutral-600">
                    See all meetings with a specific person or team across time.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:chart-box" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Meeting analytics</h3>
                  <p className="text-neutral-600">
                    Understand how much time you spend in meetings and with different people.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Perfect for</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:calendar-check" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Back-to-back meetings</h3>
                <p className="text-sm text-neutral-600">
                  Quickly prep between meetings by reviewing past notes and action items.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-tie" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Client management</h3>
                <p className="text-sm text-neutral-600">
                  See complete client history before calls - past discussions, commitments, and context.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-group" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Recurring meetings</h3>
                <p className="text-sm text-neutral-600">
                  Track progress across weekly syncs, standups, and regular check-ins.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:briefcase" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Project tracking</h3>
                <p className="text-sm text-neutral-600">
                  See all meetings related to a project organized in chronological order.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:clock-alert" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Follow-ups</h3>
                <p className="text-sm text-neutral-600">
                  Get reminded about action items tied to specific calendar events.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:chart-line" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Time analysis</h3>
                <p className="text-sm text-neutral-600">
                  Understand where your meeting time goes and optimize your schedule.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <div className="p-8 bg-green-50 border-2 border-green-200 rounded-lg text-center">
              <Icon icon="mdi:shield-check" className="text-4xl text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-serif text-stone-600 mb-3">
                Privacy-first integration
              </h3>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Calendar integration is read-only and local. We only access event metadata (title, time, attendees) to
                provide context. No calendar data is uploaded to external servers.
              </p>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Connect your calendar today
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Bring together your schedule and your notes for a complete view of your work and conversations.
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
                to="/product/contacts"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                Learn about contacts
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
