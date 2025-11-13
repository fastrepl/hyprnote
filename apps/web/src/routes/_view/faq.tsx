import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/faq")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions - Hyprnote" },
      {
        name: "description",
        content:
          "Find answers to common questions about Hyprnote, including features, privacy, pricing, and technical support.",
      },
    ],
  }),
});

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "General",
    question: "What is Hyprnote?",
    answer:
      "Hyprnote is a desktop notetaking application that captures both your microphone and system audio. It uses local AI to transcribe conversations, generate summaries, and help you organize your notes - all while keeping your data private on your device.",
  },
  {
    category: "General",
    question: "How is Hyprnote different from other meeting recorders?",
    answer:
      "Unlike bot-based recorders that join your meetings, Hyprnote runs locally on your computer and captures audio directly from your system. This means it works with any application, doesn't require meeting permissions, and keeps all your data private.",
  },
  {
    category: "Features",
    question: "What apps does Hyprnote work with?",
    answer:
      "Hyprnote works with any application on your computer - Zoom, Google Meet, Microsoft Teams, Slack, Discord, and more. It captures system audio, so it doesn't depend on specific integrations.",
  },
  {
    category: "Features",
    question: "Can I record in-person conversations?",
    answer:
      "Yes! Hyprnote captures your microphone input, so you can record in-person meetings, phone calls, or any conversation where you're using your computer's microphone.",
  },
  {
    category: "Features",
    question: "What languages does Hyprnote support?",
    answer:
      "Currently, Hyprnote supports English transcription. We're working on adding support for more languages in upcoming releases.",
  },
  {
    category: "Privacy",
    question: "Where is my data stored?",
    answer:
      "All your recordings and notes are stored locally on your device. Hyprnote doesn't send your audio or transcripts to external servers. Everything is processed on-device using local AI.",
  },
  {
    category: "Privacy",
    question: "Is my data encrypted?",
    answer:
      "Yes, all your data is encrypted at rest on your device. Your recordings, transcripts, and notes are protected with industry-standard encryption.",
  },
  {
    category: "Privacy",
    question: "Can my employer see my Hyprnote recordings?",
    answer:
      "No. Hyprnote stores everything locally on your device. Unless you explicitly share your notes or recordings, they remain private to you.",
  },
  {
    category: "Technical",
    question: "What are the system requirements?",
    answer:
      "Hyprnote requires macOS 12.0 or later with Apple Silicon (M1/M2/M3) or Intel processor. We recommend at least 8GB of RAM for optimal performance with local AI features.",
  },
  {
    category: "Technical",
    question: "How much storage space does Hyprnote need?",
    answer:
      "The app itself is about 200MB. Recording storage depends on your usage - a 1-hour meeting uses approximately 50-100MB. We recommend having at least 5GB of free space.",
  },
  {
    category: "Technical",
    question: "Does Hyprnote work offline?",
    answer:
      "Yes! Since Hyprnote uses local AI, it works completely offline. You don't need an internet connection to record, transcribe, or generate summaries.",
  },
  {
    category: "Pricing",
    question: "Is Hyprnote free?",
    answer:
      "Hyprnote offers a free tier with core features. Pro features like unlimited recording time, advanced templates, and priority support are available through our paid plans.",
  },
  {
    category: "Pricing",
    question: "Can I try Pro features before subscribing?",
    answer:
      "Yes! New users get a 14-day free trial of Hyprnote Pro to try all features before committing to a subscription.",
  },
  {
    category: "Support",
    question: "How do I get help if something isn't working?",
    answer:
      "You can reach our support team at support@hyprnote.com or join our Discord community for quick help. We also have comprehensive documentation at docs.hyprnote.com.",
  },
  {
    category: "Support",
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 30-day money-back guarantee. If you're not satisfied with Hyprnote Pro, contact us within 30 days of purchase for a full refund.",
  },
];

const categories = Array.from(new Set(faqs.map((faq) => faq.category)));

function Component() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFAQs =
    selectedCategory === "All"
      ? faqs
      : faqs.filter((faq) => faq.category === selectedCategory);

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Find answers to common questions about Hyprnote. Can't find what
              you're looking for?{" "}
              <a
                href="mailto:support@hyprnote.com"
                className="text-stone-600 hover:underline"
              >
                Contact us
              </a>
              .
            </p>
          </header>

          <div className="mb-12 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedCategory("All")}
              className={cn([
                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                selectedCategory === "All"
                  ? "bg-stone-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              ])}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn([
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  selectedCategory === category
                    ? "bg-stone-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                ])}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {filteredFAQs.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                isOpen={openIndex === index}
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>

          <div className="mt-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 text-center">
            <Icon
              icon="mdi:help-circle"
              className="text-4xl text-stone-600 mx-auto mb-4"
            />
            <h3 className="text-2xl font-serif text-stone-600 mb-4">
              Still have questions?
            </h3>
            <p className="text-neutral-600 mb-6">
              Our team is here to help. Reach out and we'll get back to you as
              soon as possible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:support@hyprnote.com"
                className={cn([
                  "inline-block px-6 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Email support
              </a>
              <a
                href="/discord"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-block px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-stone-50 transition-colors",
                ])}
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FAQItem({
  faq,
  isOpen,
  onClick,
}: {
  faq: FAQItem;
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={onClick}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-stone-50 transition-colors"
      >
        <div className="flex-1 pr-4">
          <span className="text-xs text-neutral-500 uppercase tracking-wider">
            {faq.category}
          </span>
          <h3 className="text-lg font-medium text-stone-600 mt-1">
            {faq.question}
          </h3>
        </div>
        <Icon
          icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"}
          className="text-2xl text-neutral-400 shrink-0"
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-neutral-600 leading-relaxed border-t border-neutral-100 pt-4">
          {faq.answer}
        </div>
      )}
    </div>
  );
}
