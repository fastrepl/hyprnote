import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/enterprise")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Enterprise - Hyprnote" },
      {
        name: "description",
        content:
          "Enterprise-ready meeting notes with data sovereignty, consent management, security, and access control.",
      },
      { property: "og:title", content: "Enterprise - Hyprnote" },
      {
        property: "og:description",
        content:
          "Deploy Hyprnote across your organization with enterprise features for security, compliance, and data sovereignty.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/enterprise" },
    ],
  }),
});

function Component() {
  const faqs = [
    {
      question: "How can i boost my team's product while ensuring data sovereignty?",
      answer:
        "Deploy Hyprnote on your own infrastructure to maintain complete control over your data. Your meeting recordings and transcripts never leave your network, ensuring full compliance with data residency requirements.",
    },
    {
      question: "Is there a way to ensure consents are properly granted and managed?",
      answer:
        "Hyprnote provides multiple consent options including voice-activated consent during meetings, pre-meeting consent links, and explicit consent prompts when joining. We prioritize transparency and respect in every recording scenario.",
    },
    {
      question: "How secure is the platform?",
      answer:
        "We deeply prioritize security. We're working on end-to-end encryption, seamless SSO and MFA integration, and are actively pursuing SOC 2 Type II certification. All enterprise deployments meet industry-standard security requirements.",
    },
    {
      question: "How do you manage access control?",
      answer:
        "Administrators have granular control over permissions, team workspaces, and user access. Set role-based permissions, manage team structures, and maintain centralized oversight across your entire organization.",
    },
    {
      question: "What deployment options are available?",
      answer:
        "Hyprnote adapts to your workflow with multiple form factors: native desktop applications (currently available for macOS), web interface, mobile apps, or even bot integration for remote meeting capture. Choose the deployment method that works best for your team.",
    },
  ];

  return (
    <main
      className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        {/* Hero Section */}
        <section className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
          <div className="flex flex-col items-center text-center gap-12 py-24 px-4 laptop:px-0">
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
                Enterprise
              </h1>
              <p className="text-lg sm:text-xl text-neutral-600">
                Meeting notes your team will love, with enterprise features when you need them.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <Link
                to="/founders"
                className={cn([
                  "inline-flex items-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform shadow-md hover:shadow-lg",
                ])}
              >
                <Icon icon="mdi:calendar" className="text-xl" />
                <span>Schedule a Call</span>
              </Link>
            </div>
          </div>
        </section>

        <SlashSeparator />

        {/* FAQ Section */}
        <section className="py-16 px-4 laptop:px-0">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-neutral-100 pb-6 last:border-b-0">
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    <span className="text-stone-600">Q:</span> {faq.question}
                  </h3>
                  <p className="text-neutral-600">
                    <span className="font-medium text-stone-600">A:</span> {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
