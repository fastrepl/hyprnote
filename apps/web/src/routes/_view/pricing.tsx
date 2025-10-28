import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/pricing")({
  component: Component,
});

interface PricingPlan {
  name: string;
  price: { monthly: number; yearly: number } | null;
  description: string;
  popular?: boolean;
  features: Array<{
    label: string;
    included: boolean | "partial";
    tooltip?: string;
    comingSoon?: boolean;
  }>;
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Free",
    price: null,
    description: "Fully functional with your own API keys. Perfect for individuals who want complete control.",
    features: [
      { label: "Local Transcription", included: true },
      { label: "Speaker Identification", included: true },
      { label: "Bring Your Own Key (STT & LLM)", included: true },
      { label: "Basic Sharing (Copy, PDF)", included: true },
      { label: "All Data Local", included: true },
      { label: "Integrations", included: "partial", tooltip: "Available with free account signup" },
      { label: "Templates & Chat", included: false },
      { label: "Cloud Services (STT & LLM)", included: false },
      { label: "Cloud Sync", included: false },
      { label: "Shareable Links", included: false },
      { label: "Unified Billing & Access Management", included: false },
    ],
  },
  {
    name: "Pro",
    price: {
      monthly: 35,
      yearly: 295,
    },
    description: "No API keys needed. Get cloud services, advanced sharing, and team features out of the box.",
    popular: true,
    features: [
      { label: "Everything in Free", included: true },
      { label: "Integrations", included: true },
      { label: "Templates & Chat", included: true },
      { label: "Cloud Services (STT & LLM)", included: true },
      { label: "Cloud Sync", included: true, tooltip: "Select which notes to sync", comingSoon: true },
      {
        label: "Shareable Links",
        included: true,
        tooltip: "DocSend-like: view tracking, expiration, revocation",
        comingSoon: true,
      },
      { label: "Unified Billing & Access Management", included: true, comingSoon: true },
    ],
  },
];

const infoCards = [
  {
    icon: "mdi:account-check-outline",
    title: "Speaker identification is included in all plans",
  },
  {
    icon: "mdi:link-variant",
    title: "Shareable link includes DocsSend-like controls",
    description: "viewer tracking, expiration, revocation",
  },
  {
    icon: "mdi:key-outline",
    title: "BYOK lets you connect your own LLM",
    description: "for full data control",
  },
];

function Component() {
  return (
    <main className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <HeroSection />
        <PricingCardsSection />
        <InfoCardsSection />
        <FAQSection />
        <CTASection />
      </div>
    </main>
  );
}

function HeroSection() {
  return (
    <section className="flex flex-col items-center text-center gap-6 py-24 px-4 laptop:px-0 border-b border-neutral-100">
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
          Hyprnote Pricing
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600">
          Choose the plan that fits your needs. Start for free, upgrade when you need cloud features.
        </p>
      </div>
    </section>
  );
}

function PricingCardsSection() {
  return (
    <section className="py-16 px-4 laptop:px-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {pricingPlans.map((plan) => <PricingCard key={plan.name} plan={plan} />)}
      </div>
    </section>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        "border rounded-sm overflow-hidden flex flex-col transition-transform",
        plan.popular
          ? "border-stone-600 shadow-lg relative scale-105"
          : "border-neutral-100",
      )}
    >
      {plan.popular && (
        <div className="bg-stone-600 text-white text-center py-2 px-4 text-sm font-medium">
          Most Popular
        </div>
      )}

      <div className="p-8 flex-1 flex flex-col">
        <div className="mb-6">
          <h2 className="text-2xl font-serif text-stone-600 mb-2">{plan.name}</h2>
          <p className="text-sm text-neutral-600 mb-4">{plan.description}</p>

          {plan.price
            ? (
              <div className="space-y-2">
                <div>
                  <span className="text-4xl font-serif text-stone-600">
                    ${plan.price.monthly}
                  </span>
                  <span className="text-neutral-600 ml-2">/seat/month</span>
                </div>
                <div className="text-sm text-neutral-600">
                  or ${plan.price.yearly}/seat/year <span className="text-green-700 font-medium">(save 30%)</span>
                </div>
              </div>
            )
            : <div className="text-4xl font-serif text-stone-600">Free</div>}
        </div>

        <div className="space-y-3 flex-1">
          {plan.features.map((feature, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <Icon
                icon={feature.included === true
                  ? "mdi:check-circle"
                  : feature.included === "partial"
                    ? "mdi:minus-circle"
                    : "mdi:close-circle"}
                className={cn(
                  "text-lg mt-0.5 shrink-0",
                  feature.included === true
                    ? "text-green-700"
                    : feature.included === "partial"
                      ? "text-yellow-600"
                      : "text-neutral-300",
                )}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm",
                      feature.included === true
                        ? "text-neutral-900"
                        : feature.included === "partial"
                          ? "text-neutral-700"
                          : "text-neutral-400",
                    )}
                  >
                    {feature.label}
                  </span>
                  {feature.comingSoon && (
                    <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                {feature.tooltip && (
                  <div className="text-xs text-neutral-500 italic mt-0.5">
                    {feature.tooltip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          className={cn(
            "mt-8 w-full h-10 flex items-center justify-center text-sm font-medium transition-all cursor-pointer",
            plan.popular
              ? "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]"
              : "bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%]",
          )}
        >
          {plan.price ? "Get Started" : "Download for Free"}
        </button>
      </div>
    </div>
  );
}

function InfoCardsSection() {
  return (
    <section className="py-16 px-4 laptop:px-0 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {infoCards.map((card, idx) => (
            <div
              key={idx}
              className="border border-neutral-100 rounded-sm p-6 hover:bg-neutral-50 transition-colors"
            >
              <Icon
                icon={card.icon}
                className="text-3xl text-stone-600 mb-3"
              />
              <h3 className="text-sm font-medium text-neutral-900 mb-1">
                {card.title}
              </h3>
              {card.description && <p className="text-sm text-neutral-600">{card.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    {
      question: "What does 'Local only' transcription mean?",
      answer:
        "All transcription happens on your device. Your audio never leaves your computer, ensuring complete privacy.",
    },
    {
      question: "What is BYOK (Bring Your Own Key)?",
      answer:
        "BYOK allows you to connect your own LLM provider (like OpenAI, Anthropic, or self-hosted models) for AI features while maintaining full control over your data.",
    },
    {
      question: "What's included in shareable links?",
      answer:
        "Pro users get DocsSend-like controls: track who views your notes, set expiration dates, and revoke access anytime.",
    },
    {
      question: "Is there a team discount?",
      answer: "Yes! Teams on annual plans save 30%. Contact us for larger team pricing.",
    },
  ];

  return (
    <section className="py-16 px-4 laptop:px-0 border-t border-neutral-100">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-neutral-100 pb-6 last:border-b-0">
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                {faq.question}
              </h3>
              <p className="text-neutral-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 border-t border-neutral-100 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
      <div className="flex flex-col gap-6 items-center text-center">
        <div className="mb-4 size-32 shadow-xl border border-neutral-100 flex justify-center items-center rounded-4xl bg-transparent">
          <img
            src="/hyprnote/icon.png"
            alt="Hyprnote"
            className="size-28 rounded-3xl border border-neutral-100"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif text-stone-600">
          Ready to get started?
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl">
          Download Hyprnote for free and upgrade when you need cloud features
        </p>
        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://tally.so/r/mJaRDY"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 h-10 flex items-center justify-center text-sm bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%] transition-all"
          >
            Download for Free
          </a>
          <a
            href="https://github.com/fastrepl/hyprnote"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 h-10 flex items-center justify-center text-sm bg-linear-to-t from-neutral-200 to-neutral-100 text-neutral-900 rounded-full shadow-sm hover:shadow-md hover:scale-[102%] active:scale-[98%] transition-all"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
