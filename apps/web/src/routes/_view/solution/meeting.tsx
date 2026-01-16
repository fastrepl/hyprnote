import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/solution/meeting")({
  component: Component,
  head: () => ({
    meta: [
      { title: "All Your Meeting Notes in One Place - Hyprnote" },
      {
        name: "description",
        content:
          "Zoom, Teams, Meet, Discord, or in-person, Hyprnote records it all and generates searchable meeting summaries that never leave your device.",
      },
      { name: "robots", content: "noindex, nofollow" },
      {
        property: "og:title",
        content: "All Your Meeting Notes in One Place - Hyprnote",
      },
      {
        property: "og:description",
        content:
          "Real-time transcription, 45+ languages, no bots required. AI-powered meeting notes that stay on your device.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://hyprnote.com/solution/meeting",
      },
    ],
  }),
});

const heroFeatures = [
  {
    title: "Real-Time Transcription",
    description:
      "See conversations transcribed as they happen, while you add your own notes.",
  },
  {
    title: "45+ Languages",
    description:
      "Multilingual meetings transcribed correctly, without configuration drama.",
  },
  {
    title: "No Bots",
    description:
      "Captures system audio directly—works with any platform, no bot required.",
  },
];

const features = [
  {
    icon: "mdi:note-edit",
    title: "Enhance Your Manual Notes with AI",
    description:
      "Combine your notes with AI transcription in one interface. Add context while the AI captures what's said. Later, ask AI to generate summaries, action items, or expand on specific topics using both your notes and the transcript.",
  },
  {
    icon: "mdi:magnify",
    title: "Search Across All Your Meetings",
    description:
      "Every word transcribed is searchable. Find that product decision from three months ago or the exact moment someone mentioned a deadline. Search by keyword, speaker, or date across all your meeting notes.",
  },
  {
    icon: "mdi:chat-processing",
    title: "Chat with Your Meeting Notes",
    description:
      '"What were the action items from the product sync?" "When did we discuss the Q4 budget?" "Summarize what the client said about pricing." Ask AI anything about your meeting in natural language—no manual searching required.',
  },
  {
    icon: "mdi:file-document-multiple",
    title: "Templates for Every Meeting Type",
    description:
      "Start with pre-built templates for 1:1s, standups, client calls, or interviews. Or create your own structure - action items, decisions, next steps formatted exactly how you want.",
  },
  {
    icon: "mdi:shield-lock",
    title: "Control Where Your Data Lives",
    description:
      "Run fully local with LM Studio or Ollama for offline AI processing. Or connect to cloud providers like Deepgram, AssemblyAI, or OpenAI. You decide where your data goes, not us.",
  },
];

const faqs = [
  {
    question: "Does Hyprnote work with Zoom, Teams, and Google Meet?",
    answer:
      "Yes. Hyprnote works with any application on your computer—Zoom, Teams, Meet, Slack, Discord, and more. It captures system audio directly, so no integrations needed.",
  },
  {
    question: "Do participants know they're being recorded?",
    answer:
      "Hyprnote captures audio at the system level on your device—it doesn't join meetings as a bot. Whether participants are notified depends on your meeting platform's settings and your local recording laws. You're responsible for following consent requirements in your jurisdiction.",
  },
  {
    question: "Can I use Hyprnote completely offline?",
    answer:
      "Hyprnote records audio offline. Cloud transcription requires internet, but you can generate AI summaries offline using local LLM servers like LM Studio or Ollama.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "All recordings and notes are stored locally on your device. Hyprnote doesn't send your audio or transcripts to external servers unless you choose cloud transcription.",
  },
  {
    question: "How do I ensure maximum privacy?",
    answer:
      "Use a local LLM server (LM Studio or Ollama) for AI features instead of cloud providers. Keep your recordings stored locally on your device. Review the privacy policies of your chosen STT provider. Review your settings in Settings > Intelligence. When using local LLM servers, your notes and summaries are generated on your device without being sent to external servers.",
  },
];

function Component() {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen overflow-x-hidden"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection />
        <FeaturesSection />
        <FAQSection />
        <CTASection />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="px-6 py-12 lg:py-20">
        <header className="mb-8 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100 text-stone-600 text-sm mb-6">
            <Icon icon="mdi:calendar-clock" className="text-lg" />
            <span>For Meetings</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
            All Your Meeting Notes
            <br />
            in One Place
          </h1>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-2xl mx-auto">
            Zoom, Teams, Meet, Discord, or in-person, Hyprnote records it all
            and generates searchable meeting summaries that never leave your
            device.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/download/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Download for free
            </Link>
            <Link
              to="/product/ai-notetaking/"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "border border-stone-300 text-stone-600",
                "hover:bg-stone-50 transition-colors",
              ])}
            >
              See how it works
            </Link>
          </div>
        </header>
        <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {heroFeatures.map((feature) => (
            <div
              key={feature.title}
              className="text-center p-4 rounded-xl bg-white/50 border border-neutral-100"
            >
              <h3 className="text-base font-medium text-stone-700 mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-neutral-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 text-center mb-4">
          Everything you need for meeting notes
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          AI-powered features that help you capture, organize, and act on every
          conversation.
        </p>
        <div className="space-y-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 p-6 rounded-xl bg-stone-50/50 border border-neutral-100"
            >
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                <Icon icon={feature.icon} className="text-2xl text-stone-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-stone-700 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="px-6 py-16 bg-stone-50/50 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 text-center mb-4">
          Frequently Asked Questions
        </h2>
        <p className="text-neutral-600 text-center mb-12 max-w-2xl mx-auto">
          Common questions about using Hyprnote for meeting notes.
        </p>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl border border-neutral-100"
            >
              <h3 className="text-lg font-medium text-stone-700 mb-2">
                {faq.question}
              </h3>
              <p className="text-neutral-600 text-sm leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-16 border-t border-neutral-100">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-serif text-stone-600 mb-4">
          Ready to transform your meetings?
        </h2>
        <p className="text-neutral-600 mb-8">
          Start capturing every detail with AI-powered meeting notes that
          respect your privacy.
        </p>
        <Link
          to="/download/"
          className={cn([
            "inline-block px-8 py-3 text-base font-medium rounded-full",
            "bg-linear-to-t from-stone-600 to-stone-500 text-white",
            "hover:scale-105 active:scale-95 transition-transform",
          ])}
        >
          Get started for free
        </Link>
      </div>
    </section>
  );
}
