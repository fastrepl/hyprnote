import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/local")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Local-First AI Notetaking - Hyprnote" },
      {
        name: "description",
        content:
          "Hyprnote is a desktop application that doesn't join meetings, yet can listen to every conversation. Everything runs locally with complete privacy.",
      },
      { property: "og:title", content: "Local-First AI Notetaking - Hyprnote" },
      {
        property: "og:description",
        content: "Desktop app with local AI processing. Your data never leaves your device.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hyprnote.com/product/local" },
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-sm text-green-700 mb-6">
              <Icon icon="mdi:lock" className="text-base" />
              <span>100% Local & Private</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              Your data stays
              <br />
              on your device
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote is a desktop application that captures audio locally and processes everything with on-device AI.
              No cloud uploads, no bots joining meetings, complete privacy.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">How local-first works</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <LocalFeature
                icon="mdi:download"
                title="Desktop application"
                description="Runs natively on your Mac. No web app, no browser extensions, no dependencies on external services."
              />
              <LocalFeature
                icon="mdi:harddisk"
                title="Local storage"
                description="All recordings, transcripts, and notes are stored on your device. You have full control over your data."
              />
              <LocalFeature
                icon="mdi:chip"
                title="On-device AI"
                description="AI models run locally on your computer. Processing happens entirely offline without internet."
              />
              <LocalFeature
                icon="mdi:network-off"
                title="Works offline"
                description="Record, transcribe, and generate summaries without an internet connection."
              />
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Why local-first matters
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <BenefitCard
                icon="mdi:shield-lock"
                title="Complete privacy"
                description="Your conversations never leave your computer. No cloud storage, no third-party access, no data breaches."
              />
              <BenefitCard
                icon="mdi:speedometer"
                title="Faster processing"
                description="No upload delays or API rate limits. Process recordings instantly without waiting for cloud servers."
              />
              <BenefitCard
                icon="mdi:cash-off"
                title="No usage limits"
                description="No per-minute pricing or monthly usage caps. Record as much as you want."
              />
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              No bots, no permissions
            </h2>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-lg text-neutral-600 mb-6 leading-relaxed">
                  Unlike other meeting recorders that join as a bot, Hyprnote captures audio directly from your system.
                  This means:
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <Icon icon="mdi:check-circle" className="text-green-600 text-xl shrink-0 mt-1" />
                    <span className="text-neutral-600">
                      No "Recording Bot has joined the meeting" announcements
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check-circle" className="text-green-600 text-xl shrink-0 mt-1" />
                    <span className="text-neutral-600">
                      No permissions needed from meeting hosts
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check-circle" className="text-green-600 text-xl shrink-0 mt-1" />
                    <span className="text-neutral-600">
                      Works with any app: Zoom, Meet, Teams, Slack, Discord, and more
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check-circle" className="text-green-600 text-xl shrink-0 mt-1" />
                    <span className="text-neutral-600">
                      Record in-person conversations, phone calls, and local audio
                    </span>
                  </li>
                </ul>
              </div>
              <div className="p-8 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-start gap-3 mb-6">
                  <Icon icon="mdi:robot" className="text-2xl text-red-600 shrink-0" />
                  <div>
                    <h3 className="font-serif text-lg text-red-900 mb-2">Bot-based recorders</h3>
                    <ul className="space-y-2 text-sm text-red-700">
                      <li className="flex gap-2">
                        <Icon icon="mdi:close" className="shrink-0 mt-0.5" />
                        <span>Join meetings as visible participant</span>
                      </li>
                      <li className="flex gap-2">
                        <Icon icon="mdi:close" className="shrink-0 mt-0.5" />
                        <span>Need host permission</span>
                      </li>
                      <li className="flex gap-2">
                        <Icon icon="mdi:close" className="shrink-0 mt-0.5" />
                        <span>Upload audio to cloud</span>
                      </li>
                      <li className="flex gap-2">
                        <Icon icon="mdi:close" className="shrink-0 mt-0.5" />
                        <span>Limited app compatibility</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="pt-6 border-t border-red-200">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:laptop" className="text-2xl text-green-600 shrink-0" />
                    <div>
                      <h3 className="font-serif text-lg text-green-900 mb-2">Hyprnote</h3>
                      <ul className="space-y-2 text-sm text-green-700">
                        <li className="flex gap-2">
                          <Icon icon="mdi:check" className="shrink-0 mt-0.5" />
                          <span>Invisible, local capture</span>
                        </li>
                        <li className="flex gap-2">
                          <Icon icon="mdi:check" className="shrink-0 mt-0.5" />
                          <span>No permissions needed</span>
                        </li>
                        <li className="flex gap-2">
                          <Icon icon="mdi:check" className="shrink-0 mt-0.5" />
                          <span>Everything stays on device</span>
                        </li>
                        <li className="flex gap-2">
                          <Icon icon="mdi:check" className="shrink-0 mt-0.5" />
                          <span>Works with any application</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Technical details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <TechDetail
                title="Audio Capture"
                description="Uses native macOS APIs to capture microphone and system audio with high quality."
              />
              <TechDetail
                title="AI Models"
                description="Runs Whisper and other models locally using Core ML and Metal acceleration."
              />
              <TechDetail
                title="Data Encryption"
                description="All data is encrypted at rest using industry-standard AES-256 encryption."
              />
              <TechDetail
                title="No Telemetry"
                description="We don't collect usage data, analytics, or any information about your recordings."
              />
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Experience true privacy
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Download Hyprnote and take control of your data. Everything stays on your device.
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
                Download for Mac
              </a>
              <Link
                to="/product/local-ai"
                className={cn([
                  "px-6 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                Learn about on-device AI
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LocalFeature({
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
    <div className="text-center">
      <Icon icon={icon} className="text-4xl text-stone-600 mx-auto mb-4" />
      <h3 className="text-xl font-serif text-stone-600 mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
}

function TechDetail({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-stone-50 border border-neutral-200 rounded-lg">
      <h3 className="font-medium text-stone-600 mb-2">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </div>
  );
}
