import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/ai-assistant")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Assistant - Hyprnote" },
      {
        name: "description",
        content:
          "Ask questions and get instant answers from all your recorded conversations. Chat with your notes using AI.",
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
              AI assistant for your
              <br />
              conversations
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Ask questions and get instant answers from all your recorded meetings and notes. Powered by local AI that
              understands your entire conversation history.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Ask anything</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Icon icon="mdi:message-question" className="text-xl text-blue-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-neutral-700 italic">
                      "What did Sarah say about the Q4 budget?"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pl-9">
                  <Icon icon="mdi:robot" className="text-xl text-stone-600 shrink-0 mt-1" />
                  <p className="text-sm text-neutral-600">
                    In the meeting on Dec 5th, Sarah mentioned the Q4 budget needs to be finalized by Dec 15th and
                    allocated $50K for marketing...
                  </p>
                </div>
              </div>
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Icon icon="mdi:message-question" className="text-xl text-blue-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-neutral-700 italic">
                      "What are all my action items this week?"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pl-9">
                  <Icon icon="mdi:robot" className="text-xl text-stone-600 shrink-0 mt-1" />
                  <p className="text-sm text-neutral-600">
                    You have 5 action items this week: 1) Review design mockups (due Wed), 2) Schedule call with
                    client...
                  </p>
                </div>
              </div>
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Icon icon="mdi:message-question" className="text-xl text-blue-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-neutral-700 italic">
                      "Summarize all discussions about the mobile app"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pl-9">
                  <Icon icon="mdi:robot" className="text-xl text-stone-600 shrink-0 mt-1" />
                  <p className="text-sm text-neutral-600">
                    The mobile app has been discussed in 8 meetings. Key points: targeting Q1 launch, iOS first then
                    Android...
                  </p>
                </div>
              </div>
              <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Icon icon="mdi:message-question" className="text-xl text-blue-600 shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-neutral-700 italic">
                      "Who mentioned hiring a designer?"
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 pl-9">
                  <Icon icon="mdi:robot" className="text-xl text-stone-600 shrink-0 mt-1" />
                  <p className="text-sm text-neutral-600">
                    Mike mentioned hiring a designer in the team meeting on Dec 8th. He suggested starting the search in
                    Q1...
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              How your AI assistant works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  1
                </div>
                <h3 className="font-medium text-stone-600 mb-2">AI indexes your notes</h3>
                <p className="text-sm text-neutral-600">
                  Local AI processes all your transcripts and summaries to understand context
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  2
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Ask in natural language</h3>
                <p className="text-sm text-neutral-600">
                  Type questions like you would ask a colleague
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  3
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Get instant answers</h3>
                <p className="text-sm text-neutral-600">
                  AI finds relevant information and provides accurate answers with sources
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Powerful use cases</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:clipboard-list" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Track action items</h3>
                <p className="text-neutral-600">
                  Ask for all your pending tasks across all meetings. Never let anything fall through the cracks.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:magnify" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Find decisions</h3>
                <p className="text-neutral-600">
                  Quickly locate when and why specific decisions were made, with full context.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:chart-timeline" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Track topics over time</h3>
                <p className="text-neutral-600">
                  See how discussions about a topic evolved across multiple meetings.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-search" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Remember conversations</h3>
                <p className="text-neutral-600">
                  Recall what someone said months ago by asking AI to search your history.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <div className="p-8 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
              <Icon icon="mdi:shield-lock" className="text-4xl text-blue-600 mx-auto mb-4" />
              <h3 className="text-2xl font-serif text-stone-600 mb-3">
                Private by design
              </h3>
              <p className="text-neutral-600 max-w-2xl mx-auto">
                Your AI assistant runs entirely on your device using local AI. Your questions, answers, and all
                conversation data stay private on your computer.
              </p>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Start using your AI assistant
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Get instant answers from all your meeting notes with Hyprnote's AI assistant.
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
                to="/product/notepad"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                Learn about Notepad
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
