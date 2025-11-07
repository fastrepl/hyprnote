import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { allTemplates } from "content-collections";

export const Route = createFileRoute("/_view/product/ai-notetaking")({
  component: Component,
  head: () => ({
    meta: [
      { title: "AI Notetaking - Hyprnote" },
      {
        name: "description",
        content:
          "Complete AI-powered notetaking solution. Record meetings, transcribe audio, and get intelligent summaries with customizable templates. Works with any video conferencing tool.",
      },
      { property: "og:title", content: "AI Notetaking - Hyprnote" },
      {
        property: "og:description",
        content:
          "Record meetings in real-time or upload audio files. Get instant AI transcriptions, summaries, and action items with customizable templates.",
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              AI notetaking that
              <br />
              captures everything
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Record meetings in real-time or upload audio files for transcription. Get instant AI-generated summaries
              with customizable templates. Works with any video conferencing tool.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Complete notetaking workflow</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  1
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Record or upload</h3>
                <p className="text-sm text-neutral-600">
                  Capture live audio or upload existing files
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  2
                </div>
                <h3 className="font-medium text-stone-600 mb-2">AI transcription</h3>
                <p className="text-sm text-neutral-600">
                  Local AI converts speech to text with high accuracy
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  3
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Smart summaries</h3>
                <p className="text-sm text-neutral-600">
                  Generate summaries, action items, and insights
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-600 text-white flex items-center justify-center text-xl font-medium mx-auto mb-4">
                  4
                </div>
                <h3 className="font-medium text-stone-600 mb-2">Search & share</h3>
                <p className="text-sm text-neutral-600">
                  Find information instantly and export notes
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Two ways to capture audio</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 border-2 border-stone-300 rounded-lg bg-white">
                <Icon icon="mdi:record-circle" className="text-4xl text-red-600 mb-4" />
                <h3 className="text-2xl font-serif text-stone-600 mb-3">Real-time recording</h3>
                <p className="text-neutral-600 mb-4">
                  Hit record before your meeting starts. Capture both your microphone and system audio simultaneously as
                  the conversation happens.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Live meeting capture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Dual audio recording (mic + system)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Works with Zoom, Meet, Teams, Slack, Discord</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>No bots joining your meetings</span>
                  </li>
                </ul>
              </div>
              <div className="p-8 border-2 border-stone-300 rounded-lg bg-white">
                <Icon icon="mdi:file-upload" className="text-4xl text-blue-600 mb-4" />
                <h3 className="text-2xl font-serif text-stone-600 mb-3">Upload audio files</h3>
                <p className="text-neutral-600 mb-4">
                  Already have a recording? Drag and drop audio files to get transcripts and AI-generated summaries for
                  past conversations.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Process existing recordings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Support for MP3, M4A, WAV, and more</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Batch upload multiple files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-0.5" />
                    <span>Process interviews, podcasts, lectures</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Intelligent AI summaries
            </h2>
            <p className="text-center text-neutral-600 mb-8 max-w-2xl mx-auto">
              Hyprnote's AI automatically extracts key points, decisions, and action items from your conversations. No
              more manual note-taking or post-meeting cleanup.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:star" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Key points</h3>
                <p className="text-neutral-600">
                  AI identifies the most important topics, insights, and takeaways from each conversation.
                </p>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:checkbox-marked-circle" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Action items</h3>
                <p className="text-neutral-600">
                  Automatically extracts tasks, follow-ups, and commitments made during the meeting.
                </p>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:gavel" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Decisions made</h3>
                <p className="text-neutral-600">
                  Captures important decisions, agreements, and conclusions reached during discussions.
                </p>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <Icon icon="mdi:chart-timeline" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Next steps</h3>
                <p className="text-neutral-600">
                  Identifies planned actions, timelines, and what needs to happen after the meeting.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Customizable with templates</h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-3xl">
              Use templates to control how AI structures your summaries. Choose from our library of{" "}
              {allTemplates.length} templates or create your own custom format for different meeting types.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 bg-white border-2 border-neutral-200 rounded-lg">
                <h3 className="font-serif text-lg text-stone-600 mb-3">Sprint Planning</h3>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Sprint goals</li>
                  <li>• Backlog items</li>
                  <li>• Capacity planning</li>
                  <li>• Dependencies</li>
                </ul>
              </div>
              <div className="p-6 bg-white border-2 border-neutral-200 rounded-lg">
                <h3 className="font-serif text-lg text-stone-600 mb-3">Sales Call</h3>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Company overview</li>
                  <li>• Pain points</li>
                  <li>• Budget & timeline</li>
                  <li>• Next steps</li>
                </ul>
              </div>
              <div className="p-6 bg-white border-2 border-neutral-200 rounded-lg">
                <h3 className="font-serif text-lg text-stone-600 mb-3">1:1 Meeting</h3>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• Updates</li>
                  <li>• Wins & challenges</li>
                  <li>• Feedback</li>
                  <li>• Action items</li>
                </ul>
              </div>
            </div>

            {Object.entries(getTemplatesByCategory()).map(([category, templates]) => (
              <div key={category} className="mb-12">
                <h3 className="text-xl font-serif text-stone-600 mb-6 pb-2 border-b border-neutral-200">
                  {category}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => <TemplateCard key={template.slug} template={template} />)}
                </div>
              </div>
            ))}
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
              Create custom templates
            </h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-2xl mx-auto">
              Need a specific format? Create your own custom templates to match your unique workflow and meeting
              structure.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Icon icon="mdi:pencil" className="text-2xl text-stone-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Define sections</h3>
                  <p className="text-sm text-neutral-600">
                    Specify what sections you want in your notes
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:format-list-bulleted" className="text-2xl text-stone-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Add instructions</h3>
                  <p className="text-sm text-neutral-600">
                    Tell AI what to look for in each section
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:star" className="text-2xl text-stone-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Reuse anytime</h3>
                  <p className="text-sm text-neutral-600">
                    Save and use your template for future meetings
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Powerful features</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon icon="mdi:speaker-multiple" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Speaker identification</h3>
                  <p className="text-neutral-600">
                    Automatically detect and label different speakers in your conversations.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:clock-fast" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Timestamp precision</h3>
                  <p className="text-neutral-600">
                    Jump to exact moments in your recording with accurate timestamps.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:translate" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Multi-language support</h3>
                  <p className="text-neutral-600">
                    Transcribe conversations in 100+ languages with local AI models.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon icon="mdi:file-export" className="text-3xl text-stone-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">Export flexibility</h3>
                  <p className="text-neutral-600">
                    Export transcripts and summaries in TXT, MD, PDF, or DOCX formats.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Perfect for every use case</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <UseCase
                icon="mdi:video"
                title="Live meetings"
                description="Record Zoom, Meet, Teams calls in real-time with dual audio capture."
              />
              <UseCase
                icon="mdi:microphone"
                title="Voice memos"
                description="Upload voice recordings from your phone or recorder for transcription."
              />
              <UseCase
                icon="mdi:account-voice"
                title="Interviews"
                description="Process recorded interviews to extract quotes and key insights."
              />
              <UseCase
                icon="mdi:podcast"
                title="Podcasts"
                description="Upload podcast episodes for searchable transcripts and summaries."
              />
              <UseCase
                icon="mdi:school"
                title="Lectures"
                description="Record live classes or transcribe recorded educational content."
              />
              <UseCase
                icon="mdi:presentation"
                title="Presentations"
                description="Capture webinars and presentations with speaker audio and slides."
              />
              <UseCase
                icon="mdi:account-tie"
                title="Remote meetings"
                description="Never miss important details from video calls and virtual meetings."
              />
              <UseCase
                icon="mdi:chat"
                title="Team collaboration"
                description="Keep your team aligned with comprehensive meeting records."
              />
              <UseCase
                icon="mdi:lightbulb"
                title="Brainstorming"
                description="Capture every idea during creative sessions without interruption."
              />
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              The complete AI notetaking solution
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              From live meetings to archived recordings, handle all your audio transcription and AI summary needs with
              one powerful tool.
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
                to="/product/local-ai"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                Learn about Local AI
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function UseCase({
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
      <Icon icon={icon} className="text-2xl text-stone-600 mb-3" />
      <h3 className="font-medium text-stone-600 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </div>
  );
}

function getTemplatesByCategory() {
  return allTemplates.reduce((acc, template) => {
    const category = getCategory(template.title);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof allTemplates>);
}

function getCategory(title: string): string {
  if (
    ["Sprint Planning", "Sprint Retrospective", "Daily Standup", "Technical Design Review", "Incident Postmortem"]
      .includes(title)
  ) {
    return "Engineering & Development";
  }
  if (["Product Roadmap Review", "Customer Discovery Interview", "Brainstorming Session"].includes(title)) {
    return "Product & Design";
  }
  if (["Sales Discovery Call", "Client Kickoff Meeting"].includes(title)) {
    return "Sales & Customer Success";
  }
  if (
    ["1:1 Meeting", "Performance Review", "Executive Briefing", "Board Meeting", "Project Kickoff"].includes(title)
  ) {
    return "Leadership & Management";
  }
  if (["Lecture Notes"].includes(title)) {
    return "Learning & Research";
  }
  if (["Investor Pitch Meeting"].includes(title)) {
    return "Business Development";
  }
  return "General";
}

function getIconForTemplate(title: string): string {
  const iconMap: Record<string, string> = {
    "Daily Standup": "mdi:run-fast",
    "Sprint Planning": "mdi:calendar-star",
    "Sprint Retrospective": "mdi:mirror",
    "Product Roadmap Review": "mdi:road-variant",
    "Customer Discovery Interview": "mdi:account-search",
    "Sales Discovery Call": "mdi:phone",
    "Technical Design Review": "mdi:draw",
    "Executive Briefing": "mdi:tie",
    "Board Meeting": "mdi:office-building",
    "Performance Review": "mdi:chart-line",
    "Client Kickoff Meeting": "mdi:rocket-launch",
    "Brainstorming Session": "mdi:lightbulb-on",
    "Incident Postmortem": "mdi:alert-circle",
    "Lecture Notes": "mdi:school",
    "Investor Pitch Meeting": "mdi:cash-multiple",
    "1:1 Meeting": "mdi:account-multiple",
    "Project Kickoff": "mdi:flag",
  };
  return iconMap[title] || "mdi:file-document";
}

function TemplateCard({ template }: { template: (typeof allTemplates)[0] }) {
  const icon = getIconForTemplate(template.title);

  return (
    <div className="group p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
          <Icon icon={icon} className="text-xl text-stone-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-stone-600 mb-1 group-hover:text-stone-800 transition-colors">
            {template.title}
          </h3>
          <p className="text-sm text-neutral-600 line-clamp-2">{template.description}</p>
        </div>
      </div>
      <div className="pt-4 border-t border-neutral-100">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
          Sections
        </div>
        <div className="flex flex-wrap gap-2">
          {template.sections.slice(0, 3).map((section) => (
            <span
              key={section.title}
              className="text-xs px-2 py-1 bg-stone-50 text-stone-600 rounded"
            >
              {section.title}
            </span>
          ))}
          {template.sections.length > 3 && (
            <span className="text-xs px-2 py-1 text-neutral-500">
              +{template.sections.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
