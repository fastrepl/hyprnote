import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/roadmap")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Roadmap - Hyprnote" },
      {
        name: "description",
        content:
          "See what we're building next for Hyprnote. Our product roadmap and future plans.",
      },
    ],
  }),
});

interface RoadmapItem {
  title: string;
  description: string;
  status: "shipped" | "in-progress" | "planned";
  quarter?: string;
}

const roadmapItems: RoadmapItem[] = [
  {
    title: "Dual audio capture (Mic + System)",
    description:
      "Record both microphone and system audio simultaneously for complete context.",
    status: "shipped",
    quarter: "Q4 2024",
  },
  {
    title: "Local AI transcription",
    description: "On-device speech-to-text processing with complete privacy.",
    status: "shipped",
    quarter: "Q4 2024",
  },
  {
    title: "Custom templates",
    description:
      "Create and use custom note templates for different meeting types.",
    status: "shipped",
    quarter: "Q1 2025",
  },
  {
    title: "Chat with your notes",
    description:
      "Ask questions and get insights from your recorded conversations.",
    status: "in-progress",
    quarter: "Q1 2025",
  },
  {
    title: "Multi-language support",
    description: "Transcription and summaries in multiple languages.",
    status: "in-progress",
    quarter: "Q1 2025",
  },
  {
    title: "Team workspaces",
    description: "Collaborate and share notes with your team securely.",
    status: "planned",
    quarter: "Q2 2025",
  },
  {
    title: "Calendar integration",
    description: "Automatic meeting detection and note organization.",
    status: "planned",
    quarter: "Q2 2025",
  },
  {
    title: "Action item tracking",
    description:
      "Automatically extract and track action items across all your meetings.",
    status: "planned",
    quarter: "Q2 2025",
  },
  {
    title: "Mobile apps",
    description: "Native iOS and Android apps for notetaking on the go.",
    status: "planned",
    quarter: "Q3 2025",
  },
  {
    title: "API access",
    description: "Integrate Hyprnote into your workflows with our API.",
    status: "planned",
    quarter: "Q3 2025",
  },
];

function Component() {
  const shipped = roadmapItems.filter((item) => item.status === "shipped");
  const inProgress = roadmapItems.filter(
    (item) => item.status === "in-progress",
  );
  const planned = roadmapItems.filter((item) => item.status === "planned");

  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <div className="px-6 py-12 lg:py-20">
          <header className="mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Product Roadmap
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              See what we're building and what's coming next. We're always
              listening to feedback from our community.
            </p>
          </header>

          <div className="space-y-16">
            {shipped.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Icon
                    icon="mdi:check-circle"
                    className="text-3xl text-green-600"
                  />
                  <h2 className="text-3xl font-serif text-stone-600">
                    Shipped
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {shipped.map((item) => (
                    <RoadmapCard key={item.title} item={item} />
                  ))}
                </div>
              </section>
            )}

            {inProgress.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Icon
                    icon="mdi:progress-clock"
                    className="text-3xl text-blue-600"
                  />
                  <h2 className="text-3xl font-serif text-stone-600">
                    In Progress
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {inProgress.map((item) => (
                    <RoadmapCard key={item.title} item={item} />
                  ))}
                </div>
              </section>
            )}

            {planned.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Icon
                    icon="mdi:calendar-clock"
                    className="text-3xl text-neutral-400"
                  />
                  <h2 className="text-3xl font-serif text-stone-600">
                    Planned
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  {planned.map((item) => (
                    <RoadmapCard key={item.title} item={item} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="mt-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-serif text-stone-600 mb-4">
              Have a feature request?
            </h3>
            <p className="text-neutral-600 mb-6">
              We'd love to hear your ideas. Join our community and share your
              thoughts.
            </p>
            <a
              href="https://github.com/fastrepl/hyprnote/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className={cn([
                "inline-block px-6 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Share feedback
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const statusConfig = {
    shipped: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      icon: "mdi:check-circle",
      label: "Shipped",
    },
    "in-progress": {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "mdi:progress-clock",
      label: "In Progress",
    },
    planned: {
      bg: "bg-neutral-50",
      border: "border-neutral-200",
      text: "text-neutral-600",
      icon: "mdi:calendar-clock",
      label: "Planned",
    },
  };

  const config = statusConfig[item.status];

  return (
    <div className="p-6 border border-neutral-200 rounded-lg bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-serif text-stone-600 flex-1">
          {item.title}
        </h3>
        {item.quarter && (
          <span className="text-xs text-neutral-500 ml-2">{item.quarter}</span>
        )}
      </div>
      <p className="text-neutral-600 text-sm mb-4">{item.description}</p>
      <div
        className={cn([
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
          config.bg,
          config.border,
          config.text,
        ])}
      >
        <Icon icon={config.icon} />
        <span>{config.label}</span>
      </div>
    </div>
  );
}
