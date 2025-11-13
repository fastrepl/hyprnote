import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

export const Route = createFileRoute("/_view/product/local-ai")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Local AI - Hyprnote" },
      {
        name: "description",
        content:
          "Powerful AI processing that runs entirely on your device. Private, fast, and offline-capable with local AI models.",
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
              AI that runs
              <br />
              on your device
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote uses powerful local AI models to process your meetings
              entirely on your device. No cloud uploads, complete privacy, and
              works offline.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Why local AI
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:shield-lock"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Complete privacy
                </h3>
                <p className="text-neutral-600">
                  Your meeting recordings, transcripts, and AI-generated
                  summaries never leave your computer. Zero data sent to the
                  cloud or third-party AI services.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:lightning-bolt"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Lightning fast
                </h3>
                <p className="text-neutral-600">
                  No network delays or upload times. AI processing happens
                  instantly on your device with optimized local models.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:wifi-off"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Works offline
                </h3>
                <p className="text-neutral-600">
                  Record and process meetings anywhere - on flights, in remote
                  locations, or with unreliable internet. No connection
                  required.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:credit-card-off"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  No usage limits
                </h3>
                <p className="text-neutral-600">
                  Process unlimited meetings without worrying about API costs,
                  credit limits, or subscription tiers.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Local AI vs. Cloud AI
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon
                    icon="mdi:cloud-upload"
                    className="text-2xl text-neutral-400"
                  />
                  <h3 className="font-serif text-lg text-neutral-700">
                    Cloud AI Services
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Audio uploaded to third-party servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Requires internet connection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Processing delays from uploads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Monthly usage limits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Data stored on company servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-neutral-400 shrink-0 mt-0.5"
                    />
                    <span>Compliance and audit risks</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="mdi:laptop" className="text-2xl text-green-600" />
                  <h3 className="font-serif text-lg text-green-900">
                    Hyprnote Local AI
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-green-900">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>All processing on your device</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Works completely offline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Instant processing, no uploads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Unlimited recordings</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Data never leaves your computer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Full compliance control</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Local AI capabilities
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:text"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Transcription
                </h3>
                <p className="text-sm text-neutral-600">
                  High-quality speech-to-text powered by local Whisper models.
                  Support for 100+ languages.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:file-document"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Summarization
                </h3>
                <p className="text-sm text-neutral-600">
                  AI-generated summaries with key points, decisions, and action
                  items using local LLMs.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:tag-multiple"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Classification
                </h3>
                <p className="text-sm text-neutral-600">
                  Automatic categorization and tagging of conversations by topic
                  and meeting type.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:magnify"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Semantic search
                </h3>
                <p className="text-sm text-neutral-600">
                  Find information across all meetings using natural language
                  with local embedding models.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:lightbulb"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Key insights
                </h3>
                <p className="text-sm text-neutral-600">
                  Extract decisions, questions, and important moments
                  automatically from transcripts.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:account-voice"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Speaker detection
                </h3>
                <p className="text-sm text-neutral-600">
                  Identify different speakers and attribute quotes accurately
                  with diarization.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              AI models we use
            </h2>
            <div className="space-y-6">
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <div className="flex items-start gap-4 mb-4">
                  <Icon
                    icon="mdi:microphone"
                    className="text-3xl text-stone-600 shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-serif text-stone-600 mb-2">
                      Whisper for transcription
                    </h3>
                    <p className="text-neutral-600">
                      OpenAI's Whisper model running locally on your device.
                      Best-in-class accuracy for speech recognition with support
                      for 100+ languages and robust handling of accents and
                      background noise.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <div className="flex items-start gap-4 mb-4">
                  <Icon
                    icon="mdi:brain"
                    className="text-3xl text-stone-600 shrink-0"
                  />
                  <div>
                    <h3 className="text-xl font-serif text-stone-600 mb-2">
                      Local LLMs for understanding
                    </h3>
                    <p className="text-neutral-600">
                      Optimized language models for summarization, extraction,
                      and analysis. Powerful enough for enterprise-grade
                      results, efficient enough to run on your laptop.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Built for compliance
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon
                  icon="mdi:shield-check"
                  className="text-3xl text-green-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    GDPR & HIPAA ready
                  </h3>
                  <p className="text-neutral-600">
                    Meet data protection requirements by keeping sensitive
                    conversations entirely local on user devices.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon
                  icon="mdi:account-lock"
                  className="text-3xl text-blue-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    Zero data leaks
                  </h3>
                  <p className="text-neutral-600">
                    Eliminate the risk of data breaches, unauthorized access, or
                    third-party data mining completely.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon
                  icon="mdi:file-lock"
                  className="text-3xl text-purple-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    Full data ownership
                  </h3>
                  <p className="text-neutral-600">
                    Users maintain complete ownership and control. Data stored
                    in standard formats on their devices.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <Icon
                  icon="mdi:server-off"
                  className="text-3xl text-orange-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    No vendor lock-in
                  </h3>
                  <p className="text-neutral-600">
                    Data isn't trapped in a proprietary cloud system. Users can
                    export and migrate anytime.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              AI without compromising privacy
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Get enterprise-grade AI features without sacrificing data privacy.
              Experience the best of both worlds with local AI.
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
                  "hover:bg-stone-50 transition-colors",
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
