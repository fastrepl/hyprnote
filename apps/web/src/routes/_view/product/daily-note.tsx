import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";

import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/daily-note")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Daily Notes - Hyprnote" },
      {
        name: "description",
        content:
          "Automatic daily notes that consolidate all your meetings, action items, and insights into one organized view for each day.",
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-sm text-orange-700 mb-6">
              <Icon icon="mdi:hammer-wrench" className="text-base" />
              <span>In Construction</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Your day,
              <br />
              automatically organized
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Daily notes automatically consolidate all your meetings, conversations, and tasks into one chronological
              view. See everything that happened each day at a glance.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Everything in one place</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:calendar-today" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Automatic aggregation</h3>
                <p className="text-neutral-600">
                  All meetings, notes, and action items from a single day automatically appear in your daily note.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:clock-outline" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Chronological timeline</h3>
                <p className="text-neutral-600">
                  See your day unfold in order, with timestamps showing when each meeting or note was created.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:checkbox-marked-circle" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Unified action items</h3>
                <p className="text-neutral-600">
                  All tasks and to-dos from every meeting collected in one section for easy tracking.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:chart-box" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Daily summary</h3>
                <p className="text-neutral-600">
                  AI-generated overview highlighting the most important moments and decisions of your day.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              What's in a daily note
            </h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <Icon icon="mdi:video" className="text-2xl text-blue-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-600 mb-2">Meetings & Calls</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      All recorded meetings with their summaries, key points, and timestamps.
                    </p>
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded">
                      <div className="font-medium mb-1">9:00 AM - Team Standup</div>
                      <div>Key decisions, action items, next steps...</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <Icon icon="mdi:clipboard-list" className="text-2xl text-green-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-600 mb-2">Action Items</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Consolidated list of all tasks and to-dos mentioned across meetings.
                    </p>
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded">
                      <div>□ Review design mockups by EOD</div>
                      <div>□ Schedule follow-up with client</div>
                      <div>□ Update project timeline</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <Icon icon="mdi:star" className="text-2xl text-yellow-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-600 mb-2">Key Insights</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Important decisions, blockers, and highlights from across all conversations.
                    </p>
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded">
                      <div>• Decided to prioritize mobile app for Q1</div>
                      <div>• Budget approved for new designer</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-4">
                  <Icon icon="mdi:note-text" className="text-2xl text-purple-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-600 mb-2">Manual Notes</h3>
                    <p className="text-sm text-neutral-600 mb-3">
                      Your own thoughts, reflections, and notes added throughout the day.
                    </p>
                    <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded">
                      <div>Ideas for new feature, follow-up questions...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Perfect for reflection</h2>
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon icon="mdi:briefcase-check" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">End-of-day review</h3>
                  <p className="text-neutral-600">
                    Quickly scan your daily note to see what you accomplished and what needs attention tomorrow.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:calendar-week" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Weekly planning</h3>
                  <p className="text-neutral-600">
                    Review the week's daily notes to prepare status updates and plan ahead.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:chart-line" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Track progress</h3>
                  <p className="text-neutral-600">
                    See patterns in your work, identify bottlenecks, and understand where your time goes.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:account-tie" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">1:1 preparation</h3>
                  <p className="text-neutral-600">
                    Review recent daily notes before manager meetings to discuss what you've been working on.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
              <Icon icon="mdi:rocket-launch" className="text-4xl text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-serif text-stone-600 mb-3">
                Coming soon
              </h3>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Daily notes are currently in development. We're building a beautiful, automatic way to organize and
                reflect on your day.
              </p>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Be notified when it's ready
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Join the waitlist to get early access to daily notes and other upcoming features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/join-waitlist"
                className={cn([
                  "px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Join waitlist
              </Link>
              <a
                href="https://hyprnote.com/download"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                Download Hyprnote
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
