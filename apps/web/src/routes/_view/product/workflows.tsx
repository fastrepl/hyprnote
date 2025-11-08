import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/workflows")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Workflows - Hyprnote" },
      {
        name: "description",
        content: "Automate your meeting workflow with powerful automation. No coding required. Workflows coming soon.",
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
          <header className="mb-16 text-center">
            <div className="inline-block px-4 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-full mb-6">
              Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Automate your workflow
              <br />
              with powerful automation
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl mx-auto">
              Automate repetitive tasks with powerful workflows. No coding required. Coming soon.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Workflow automation</h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Set up workflows once and let them handle repetitive tasks automatically.
            </p>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <Icon icon="mdi:auto-fix" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Auto-process meetings</h3>
                <p className="text-neutral-600 mb-4">
                  Automatically transcribe, summarize, and extract action items from all your meetings without manual
                  intervention.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Trigger workflows on meeting end</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Apply custom templates automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Tag and categorize by meeting type</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <Icon icon="mdi:bell-ring" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Smart notifications</h3>
                <p className="text-neutral-600 mb-4">
                  Get notified when important events happen in your meetings. Set up custom alerts based on keywords,
                  speakers, or topics.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Alert on specific keywords mentioned</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Notify on action items assigned to you</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Daily/weekly digest summaries</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:file-export" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Auto-export</h3>
                <p className="text-sm text-neutral-600">
                  Automatically export notes to specific folders or formats after each meeting.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:email-send" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Email summaries</h3>
                <p className="text-sm text-neutral-600">
                  Send meeting summaries to participants or stakeholders automatically.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:calendar-sync" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Calendar sync</h3>
                <p className="text-sm text-neutral-600">
                  Attach notes to calendar events and sync action items as tasks.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Workflow use cases
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-group" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Team standups</h3>
                <p className="text-neutral-600">
                  Automatically transcribe daily standups, extract updates from each team member, and send a digest to
                  the team channel.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:briefcase" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Client meetings</h3>
                <p className="text-neutral-600">
                  Process client calls, extract action items, create tasks in your project management tool, and send
                  follow-up emails.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:school" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Interviews</h3>
                <p className="text-neutral-600">
                  Transcribe interviews, extract key insights, apply custom evaluation templates, and save to your ATS.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:chart-line" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Sales calls</h3>
                <p className="text-neutral-600">
                  Record sales calls, identify key objections and questions, log to CRM, and notify relevant team
                  members.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              How workflows work
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center font-serif text-lg">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Set triggers</h3>
                  <p className="text-neutral-600">
                    Choose what starts your workflow: meeting end, keyword detection, scheduled time, or manual trigger.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center font-serif text-lg">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Add conditions</h3>
                  <p className="text-neutral-600">
                    Add rules to filter when workflows run: meeting duration, participants, tags, or custom conditions.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center font-serif text-lg">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Define actions</h3>
                  <p className="text-neutral-600">
                    Choose what happens next: send notifications, export files, create tasks, or connect to
                    integrations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center font-serif text-lg">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Let it run</h3>
                  <p className="text-neutral-600">
                    Workflows run automatically in the background. Monitor activity and adjust as needed.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Get notified when we launch
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Be the first to know when workflows become available.
            </p>
            <a
              href="/join-waitlist"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Join waitlist
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
