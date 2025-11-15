import { Icon } from "@iconify-icon/react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";

export const Route = createFileRoute("/_view/product/notepad")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Notepad - Hyprnote" },
      {
        name: "description",
        content:
          "Private, local-first notepad with no bots. Record meetings directly from your device with AI processing that never leaves your computer.",
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
        <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
          <header className="mb-12 text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600 mb-6">
              Your private notepad. No bots. Local-first.
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Record meetings without bots and process everything locally for
              complete privacy
            </p>
            <div className="mt-8">
              <a
                href="https://hyprnote.com/download"
                className={cn([
                  "inline-block px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                Download for free
              </a>
            </div>
          </header>
        </div>

        <SlashSeparator />

        <div className="px-6 py-12 lg:py-20">
          <section className="mb-16">
            <div className="grid md:grid-cols-3 border-t border-neutral-100">
              <div className="p-6 text-left border-b md:border-b-0 md:border-r border-neutral-100">
                <h3 className="font-medium mb-1 text-neutral-900 font-mono">
                  No Bots
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Record directly from your device without intrusive meeting
                  bots.
                </p>
              </div>
              <div className="p-6 text-left border-b md:border-b-0 md:border-r border-neutral-100">
                <h3 className="font-medium mb-1 text-neutral-900 font-mono">
                  Local-First
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  All AI processing happens on your device, nothing sent to
                  cloud.
                </p>
              </div>
              <div className="p-6 text-left">
                <h3 className="font-medium mb-1 text-neutral-900 font-mono">
                  Fully Private
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  Your conversations stay yours, complete data ownership.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Why Hyprnote Notepad
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <Icon
                  icon="mdi:robot-off"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  No bots, no interruptions
                </h3>
                <p className="text-neutral-600 mb-4">
                  Unlike other AI notetakers, Hyprnote doesn't send bots to join
                  your meetings. Record directly from your device for seamless,
                  unobtrusive capture.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Stay under the radar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>No awkward "bot has joined" notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Works everywhere - Zoom, Meet, Teams, Discord</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>No host permissions needed</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-white">
                <Icon
                  icon="mdi:laptop"
                  className="text-3xl text-stone-600 mb-4"
                />
                <h3 className="text-xl font-serif text-stone-600 mb-2">
                  Local-first AI processing
                </h3>
                <p className="text-neutral-600 mb-4">
                  All your data stays on your device. AI processes recordings
                  locally with no cloud uploads or third-party servers.
                </p>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>
                      Complete privacy - data never leaves your computer
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Lightning fast - no network delays</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Works offline completely</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Unlimited processing - no API costs</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Hyprnote vs. Bot-based services
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="mdi:robot" className="text-2xl text-red-600" />
                  <h3 className="font-serif text-lg text-red-900">
                    Bot-based Services
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-red-900">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Bot announces itself when joining</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Makes participants self-conscious</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Audio uploaded to company servers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Requires internet connection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Processing delays from uploads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Monthly usage limits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:close"
                      className="text-red-600 shrink-0 mt-0.5"
                    />
                    <span>Only works with supported platforms</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Icon icon="mdi:laptop" className="text-2xl text-green-600" />
                  <h3 className="font-serif text-lg text-green-900">
                    Hyprnote Notepad
                  </h3>
                </div>
                <ul className="space-y-3 text-sm text-green-900">
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Silent background recording</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Icon
                      icon="mdi:check"
                      className="text-green-600 shrink-0 mt-0.5"
                    />
                    <span>Natural conversations flow freely</span>
                  </li>
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
                    <span>Works with any application</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Built for privacy and compliance
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Icon
                  icon="mdi:shield-check"
                  className="text-3xl text-green-600 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-2">
                    Compliance-ready
                  </h3>
                  <p className="text-neutral-600">
                    Meet GDPR, HIPAA, and other data protection requirements by
                    keeping sensitive conversations entirely local on your
                    device.
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
                    third-party data mining. Your data never leaves your
                    computer.
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
                    Maintain complete ownership and control. Export, backup, or
                    delete your data anytime without requesting access from a
                    service provider.
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
                    Your data isn't trapped in a proprietary cloud system. It's
                    stored in standard formats on your device.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Perfect for sensitive meetings
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:briefcase"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Confidential discussions
                </h3>
                <p className="text-sm text-neutral-600">
                  Keep sensitive business conversations private without
                  third-party bots listening in.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:gavel"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Legal consultations
                </h3>
                <p className="text-sm text-neutral-600">
                  Record attorney-client conversations without privacy concerns
                  or compliance issues.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:hospital-box"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Healthcare meetings
                </h3>
                <p className="text-sm text-neutral-600">
                  Maintain HIPAA compliance by keeping all recordings local and
                  private.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:account-group"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  HR discussions
                </h3>
                <p className="text-sm text-neutral-600">
                  Document performance reviews and sensitive HR matters
                  discreetly.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:handshake"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Client calls
                </h3>
                <p className="text-sm text-neutral-600">
                  Take notes without making clients uncomfortable about bots
                  joining.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon
                  icon="mdi:lightbulb"
                  className="text-2xl text-stone-600 mb-3"
                />
                <h3 className="font-medium text-stone-600 mb-2">
                  Creative sessions
                </h3>
                <p className="text-sm text-neutral-600">
                  Let ideas flow naturally without the self-consciousness of
                  visible recording.
                </p>
              </div>
            </div>
          </section>

          <SlashSeparator />

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">
              Powerful local AI capabilities
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
                  AI-generated summaries with key points and action items.
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
                  Automatic categorization and tagging of conversations.
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
                  Find information across all meetings using natural language.
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
                  automatically.
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
                  Identify different speakers and attribute quotes accurately.
                </p>
              </div>
            </div>
          </section>
        </div>

        <SlashSeparator />

        <section className="py-16 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 lg:px-0">
          <div className="flex flex-col gap-6 items-center text-center">
            <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
              <img
                src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
                alt="Hyprnote"
                width={144}
                height={144}
                className="size-36 mx-auto rounded-[40px] border border-neutral-100"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif">
              The privacy-first notepad
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Experience professional AI notetaking without bots, cloud uploads,
              or privacy compromises. Your data stays yours
            </p>
            <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="https://hyprnote.com/download"
                className={cn([
                  "group px-6 h-12 flex items-center justify-center text-base sm:text-lg",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white rounded-full",
                  "shadow-md hover:shadow-lg hover:scale-[102%] active:scale-[98%]",
                  "transition-all",
                ])}
              >
                Download for free
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m12.75 15 3-3m0 0-3-3m3 3h-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </a>
              <Link
                to="/product/ai-notetaking"
                className={cn([
                  "px-6 h-12 flex items-center justify-center text-base sm:text-lg",
                  "border border-neutral-300 text-stone-600 rounded-full",
                  "hover:bg-white transition-colors",
                ])}
              >
                Explore AI notetaking features
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
