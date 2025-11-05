import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/local-ai")({
  component: Component,
  head: () => ({
    meta: [
      { title: "On-Device AI - Hyprnote" },
      {
        name: "description",
        content:
          "Hyprnote uses on-device AI models to process your recordings locally. Fast, private, and works offline.",
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-sm text-purple-700 mb-6">
              <Icon icon="mdi:chip" className="text-base" />
              <span>On-Device AI</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              AI that runs
              <br />
              on your device
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Hyprnote uses state-of-the-art AI models that run entirely on your computer. Fast processing, complete
              privacy, works offline.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Powered by local AI</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:microphone-variant" className="text-4xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-3">Speech Recognition</h3>
                <p className="text-neutral-600 mb-4">
                  Uses Whisper, OpenAI's speech recognition model, optimized to run on your Mac with Apple Silicon or
                  Intel processors.
                </p>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Icon icon="mdi:speedometer" />
                  <span>Real-time transcription</span>
                </div>
              </div>
              <div className="p-8 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:text-box" className="text-4xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-3">Natural Language Processing</h3>
                <p className="text-neutral-600 mb-4">
                  Advanced NLP models extract summaries, action items, and insights from your transcripts - all
                  processed locally.
                </p>
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Icon icon="mdi:brain" />
                  <span>Smart summarization</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Benefits of on-device AI
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Icon icon="mdi:shield-lock" className="text-4xl text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-600 mb-2">Private by design</h3>
                <p className="text-neutral-600">
                  Your audio never leaves your device. AI processing happens locally without internet.
                </p>
              </div>
              <div className="text-center">
                <Icon icon="mdi:lightning-bolt" className="text-4xl text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-600 mb-2">Blazing fast</h3>
                <p className="text-neutral-600">
                  No network latency. Process hours of audio in minutes with GPU acceleration.
                </p>
              </div>
              <div className="text-center">
                <Icon icon="mdi:network-off" className="text-4xl text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-600 mb-2">Works offline</h3>
                <p className="text-neutral-600">
                  No internet required. Record and transcribe anywhere, anytime.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">System requirements</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-600 mb-4">Recommended</h3>
                <ul className="space-y-3 text-neutral-600">
                  <li className="flex gap-3">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-1" />
                    <span>Apple Silicon (M1, M2, M3) Mac</span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-1" />
                    <span>16GB RAM or more</span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check" className="text-green-600 shrink-0 mt-1" />
                    <span>10GB free storage</span>
                  </li>
                </ul>
              </div>
              <div className="p-6 bg-white border border-neutral-200 rounded-lg">
                <h3 className="font-medium text-stone-600 mb-4">Minimum</h3>
                <ul className="space-y-3 text-neutral-600">
                  <li className="flex gap-3">
                    <Icon icon="mdi:check" className="text-neutral-400 shrink-0 mt-1" />
                    <span>Intel Mac (2018 or later)</span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check" className="text-neutral-400 shrink-0 mt-1" />
                    <span>8GB RAM</span>
                  </li>
                  <li className="flex gap-3">
                    <Icon icon="mdi:check" className="text-neutral-400 shrink-0 mt-1" />
                    <span>5GB free storage</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Experience the power of local AI
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Download Hyprnote and see how fast on-device AI can be.
            </p>
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
          </section>
        </div>
      </div>
    </div>
  );
}
