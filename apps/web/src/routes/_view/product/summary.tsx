import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/summary")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI-Generated Summaries - Hyprnote" },
      {
        name: "description",
        content:
          "Get instant, intelligent summaries of your meetings. Hyprnote extracts key points, decisions, and action items automatically.",
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
          <nav className="mb-8">
            <Link
              to="/product"
              className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-stone-600 transition-colors"
            >
              <Icon icon="mdi:arrow-left" className="text-base" />
              <span>Product</span>
            </Link>
          </nav>

          <header className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Intelligent summaries
              <br />
              in seconds
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote's AI automatically extracts key points, decisions, and action items from your conversations. No
              more manual note-taking or post-meeting cleanup.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">What gets summarized</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:star" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Key points</h3>
                <p className="text-neutral-600">
                  AI identifies the most important topics, insights, and takeaways from each conversation.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:checkbox-marked-circle" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Action items</h3>
                <p className="text-neutral-600">
                  Automatically extracts tasks, follow-ups, and commitments made during the meeting.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:gavel" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Decisions made</h3>
                <p className="text-neutral-600">
                  Captures important decisions, agreements, and conclusions reached during discussions.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:chart-timeline" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Next steps</h3>
                <p className="text-neutral-600">
                  Identifies planned actions, timelines, and what needs to happen after the meeting.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Customizable with templates
            </h2>
            <p className="text-center text-neutral-600 mb-8 max-w-2xl mx-auto">
              Use templates to control how AI structures your summaries. Different formats for different meeting types.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-serif text-lg text-stone-600 mb-3">Sprint Planning</h3>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Sprint goals</li>
                  <li>• Backlog items</li>
                  <li>• Capacity planning</li>
                  <li>• Dependencies</li>
                </ul>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-serif text-lg text-stone-600 mb-3">Sales Call</h3>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Company overview</li>
                  <li>• Pain points</li>
                  <li>• Budget & timeline</li>
                  <li>• Next steps</li>
                </ul>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-serif text-lg text-stone-600 mb-3">1:1 Meeting</h3>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Updates</li>
                  <li>• Wins & challenges</li>
                  <li>• Feedback</li>
                  <li>• Action items</li>
                </ul>
              </div>
            </div>
            <div className="text-center">
              <Link
                to="/product/templates"
                className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
              >
                <span>Explore all 17 templates</span>
                <Icon icon="mdi:arrow-right" />
              </Link>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Save hours every week</h2>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Stop spending hours after meetings cleaning up notes and writing summaries. Let AI do it for you
                  instantly.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:clock" className="text-2xl text-green-600 shrink-0" />
                    <div>
                      <h3 className="font-medium text-stone-600 mb-1">Instant results</h3>
                      <p className="text-sm text-neutral-600">
                        Get summaries seconds after your meeting ends
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:target" className="text-2xl text-blue-600 shrink-0" />
                    <div>
                      <h3 className="font-medium text-stone-600 mb-1">Always consistent</h3>
                      <p className="text-sm text-neutral-600">
                        Same structure and quality every time
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:share-variant" className="text-2xl text-purple-600 shrink-0" />
                    <div>
                      <h3 className="font-medium text-stone-600 mb-1">Easy to share</h3>
                      <p className="text-sm text-neutral-600">
                        Export and share with your team immediately
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-stone-50 border-2 border-neutral-200 rounded-lg">
                <div className="mb-4">
                  <div className="text-sm text-neutral-500 mb-2">Example Summary</div>
                  <h3 className="text-xl font-serif text-stone-600 mb-4">Product Roadmap Q1 2025</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-stone-600 mb-1">Key Decisions</div>
                    <ul className="space-y-1 text-neutral-600 list-disc list-inside">
                      <li>Prioritize mobile app for Q1 launch</li>
                      <li>Allocate 2 engineers to performance optimization</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-stone-600 mb-1">Action Items</div>
                    <ul className="space-y-1 text-neutral-600 list-disc list-inside">
                      <li>Sarah: Complete user research by Jan 15</li>
                      <li>Mike: Draft technical specs by Jan 20</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-stone-600 mb-1">Next Meeting</div>
                    <p className="text-neutral-600">January 25, 2025 - Review progress</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Never write meeting notes again
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Let AI create perfect summaries for every conversation.
            </p>
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
          </section>
        </div>
      </div>
    </div>
  );
}
