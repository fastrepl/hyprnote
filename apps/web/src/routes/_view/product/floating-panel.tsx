import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/floating-panel")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Floating Panel - Hyprnote" },
      {
        name: "description",
        content:
          "Keep your notes accessible with a floating panel that stays on top of all windows. Quick access to transcripts and summaries during meetings.",
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
              Always-accessible
              <br />
              floating panel
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              A lightweight, always-on-top panel that gives you instant access to meeting transcripts, summaries, and
              notes without leaving your current application.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Stay focused, stay informed</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:window-restore" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Always on top</h3>
                <p className="text-neutral-600">
                  The floating panel stays visible above all your other windows, giving you constant access to your
                  notes.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:resize" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Customizable size</h3>
                <p className="text-neutral-600">
                  Resize and position the panel anywhere on your screen to fit your workflow perfectly.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:eye-off" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Minimal distraction</h3>
                <p className="text-neutral-600">
                  Compact and transparent design that doesn't interfere with your work or video calls.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:lightning-bolt" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Quick actions</h3>
                <p className="text-neutral-600">
                  Start/stop recording, view live transcripts, and access recent notes with one click.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Real-time insights during meetings
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:text" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Live transcript</h3>
                <p className="text-sm text-neutral-600">
                  See speech-to-text transcription appear in real-time as people speak.
                </p>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:star" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Key moments</h3>
                <p className="text-sm text-neutral-600">
                  AI highlights important points, decisions, and action items as they happen.
                </p>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:bookmark" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Quick bookmarks</h3>
                <p className="text-sm text-neutral-600">
                  Tag important moments with keyboard shortcuts for easy reference later.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Use cases</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:presentation" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Presenting</h3>
                <p className="text-sm text-neutral-600">
                  Keep notes visible while sharing your screen during presentations.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:code-braces" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Coding</h3>
                <p className="text-sm text-neutral-600">
                  Reference meeting notes while working in your IDE or terminal.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:video" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Video calls</h3>
                <p className="text-sm text-neutral-600">
                  View live transcript alongside your video conferencing app.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:file-document" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Writing</h3>
                <p className="text-sm text-neutral-600">
                  Keep meeting context visible while drafting documents or emails.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:clipboard-check" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Task tracking</h3>
                <p className="text-sm text-neutral-600">
                  See action items while working in project management tools.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-multiple" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Back-to-back meetings</h3>
                <p className="text-sm text-neutral-600">
                  Quickly review previous meeting notes before the next one starts.
                </p>
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
                The floating panel is currently in development. We're working hard to bring you this powerful feature
                that will transform how you access your notes during work.
              </p>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Get notified when it launches
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Join the waitlist to be among the first to try the floating panel when it's ready.
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
