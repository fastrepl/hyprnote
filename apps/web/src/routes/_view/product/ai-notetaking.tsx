import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/ai-notetaking")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI-Powered Notetaking - Hyprnote" },
      {
        name: "description",
        content:
          "Experience intelligent notetaking with local AI. Hyprnote automatically transcribes, summarizes, and extracts insights from your conversations - all on your device.",
      },
      { property: "og:title", content: "AI-Powered Notetaking - Hyprnote" },
      {
        property: "og:description",
        content:
          "Let AI handle the notetaking while you focus on the conversation. Automatic transcription, summaries, and insights.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/product/ai-notetaking" },
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-sm text-stone-600 mb-6">
              <Icon icon="mdi:chip" className="text-base" />
              <span>Powered by local AI</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              AI that takes notes
              <br />
              for you
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Focus on the conversation while AI handles everything else. Automatic transcription, intelligent
              summaries, and actionable insights - all processed locally on your device.
            </p>
          </header>

          <section className="mb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-serif text-stone-600 mb-6">
                  Intelligent automation
                </h2>
                <div className="space-y-6">
                  <AIFeature
                    icon="mdi:text"
                    title="Accurate transcription"
                    description="Convert speech to text with high accuracy, capturing every word from both sides of the conversation."
                  />
                  <AIFeature
                    icon="mdi:file-document"
                    title="Smart summaries"
                    description="Get concise summaries that capture the key points, decisions, and outcomes of each conversation."
                  />
                  <AIFeature
                    icon="mdi:checkbox-marked-circle"
                    title="Action item extraction"
                    description="Automatically identify and extract action items, tasks, and follow-ups from discussions."
                  />
                  <AIFeature
                    icon="mdi:format-list-bulleted"
                    title="Key topics"
                    description="AI identifies and organizes the main topics discussed for easy navigation."
                  />
                </div>
              </div>
              <div className="p-8 border-2 border-neutral-200 rounded-lg bg-stone-50">
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <Icon
                        icon="mdi:microphone"
                        className="text-xl text-stone-600 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-xs text-neutral-500 mb-1">Recording</div>
                        <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full w-3/4 bg-stone-600 rounded-full animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded border border-neutral-200">
                    <div className="flex items-start gap-3">
                      <Icon icon="mdi:brain" className="text-xl text-stone-600 mt-0.5" />
                      <div>
                        <div className="text-xs text-neutral-500 mb-2">AI Processing</div>
                        <div className="space-y-1 text-xs text-neutral-600">
                          <div className="flex items-center gap-2">
                            <Icon icon="mdi:check" className="text-green-600" />
                            <span>Transcription complete</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Icon icon="mdi:loading" className="animate-spin text-stone-600" />
                            <span>Generating summary...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              What AI extracts for you
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ExtractionCard
                icon="mdi:clipboard-check"
                title="Action items"
                example="Follow up with Sarah about Q4 budget"
              />
              <ExtractionCard
                icon="mdi:calendar"
                title="Dates & deadlines"
                example="Launch scheduled for March 15th"
              />
              <ExtractionCard
                icon="mdi:account-group"
                title="Participants"
                example="John, Sarah, Mike discussed..."
              />
              <ExtractionCard
                icon="mdi:lightbulb"
                title="Key decisions"
                example="Approved new feature roadmap"
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Customizable AI output</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-3xl">
              Use templates to control how AI structures your notes. Different formats for different meeting types.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <TemplateCard
                title="Daily standup"
                items={["Yesterday's progress", "Today's plan", "Blockers"]}
              />
              <TemplateCard
                title="Project kickoff"
                items={["Goals", "Timeline", "Stakeholders", "Next steps"]}
              />
              <TemplateCard
                title="1:1 meetings"
                items={["Updates", "Wins & challenges", "Feedback", "Action items"]}
              />
            </div>
            <div className="mt-8 text-center">
              <Link
                to="/product/templates"
                className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-800 transition-colors"
              >
                <span>Explore all templates</span>
                <Icon icon="mdi:arrow-right" />
              </Link>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Why AI notetaking works
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <BenefitCard
                icon="mdi:account-voice"
                title="Stay present"
                description="Focus fully on the conversation instead of frantically writing notes. Be an active participant, not a transcriber."
              />
              <BenefitCard
                icon="mdi:speedometer"
                title="Save time"
                description="No more spending hours cleaning up and organizing notes after meetings. AI does it instantly."
              />
              <BenefitCard
                icon="mdi:target-account"
                title="Better accuracy"
                description="Never misquote or misremember. AI captures exactly what was said, word for word."
              />
              <BenefitCard
                icon="mdi:magnify"
                title="Discover insights"
                description="AI can identify patterns, themes, and connections you might miss while manually taking notes."
              />
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Let AI be your note-taker
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Join professionals who've reclaimed hours of time and improved their meeting outcomes with AI-powered
              notetaking.
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
                Get started free
              </a>
              <Link
                to="/product/local"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                Learn about local AI
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function AIFeature({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
        <Icon icon={icon} className="text-xl text-stone-600" />
      </div>
      <div>
        <h3 className="font-medium text-stone-600 mb-1">{title}</h3>
        <p className="text-sm text-neutral-600">{description}</p>
      </div>
    </div>
  );
}

function ExtractionCard({
  icon,
  title,
  example,
}: {
  icon: string;
  title: string;
  example: string;
}) {
  return (
    <div className="p-6 bg-white border border-neutral-200 rounded-lg">
      <Icon icon={icon} className="text-2xl text-stone-600 mb-3" />
      <h3 className="font-medium text-stone-600 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 italic">"{example}"</p>
    </div>
  );
}

function TemplateCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white">
      <h3 className="font-serif text-lg text-stone-600 mb-4">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-neutral-600">
            <Icon icon="mdi:check" className="text-stone-600 mt-0.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white">
      <Icon icon={icon} className="text-3xl text-stone-600 mb-4" />
      <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}
