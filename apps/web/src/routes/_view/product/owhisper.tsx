import { cn } from "@hypr/utils";
import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/owhisper")({
  component: Component,
  head: () => ({
    meta: [
      { title: "OWhisper - Hyprnote" },
      {
        name: "description",
        content:
          "Open-source Whisper implementation for high-quality speech-to-text transcription. Powered by Hyprnote.",
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-sm text-green-700 mb-6">
              <Icon icon="mdi:open-source-initiative" className="text-base" />
              <span>Open Source</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-600 mb-6">
              OWhisper
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              High-quality, open-source speech-to-text transcription powered by OpenAI's Whisper. The same technology
              that powers Hyprnote's local AI transcription.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">What is OWhisper?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:code-braces" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Open-source implementation</h3>
                <p className="text-neutral-600">
                  Our optimized, open-source implementation of OpenAI's Whisper model for fast, accurate transcription
                  on any device.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:speedometer" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Optimized performance</h3>
                <p className="text-neutral-600">
                  Highly optimized for speed and efficiency. Transcribe hours of audio in minutes on modern hardware.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:earth" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">100+ languages</h3>
                <p className="text-neutral-600">
                  Support for over 100 languages with automatic language detection and robust accent handling.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:laptop" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Runs locally</h3>
                <p className="text-neutral-600">
                  Process audio entirely on your device. No cloud uploads, complete privacy, and works offline.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Features
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-2xl text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">High accuracy</h3>
                  <p className="text-sm text-neutral-600">
                    Near-human-level accuracy with state-of-the-art Whisper models
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-2xl text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Timestamps</h3>
                  <p className="text-sm text-neutral-600">
                    Word-level and segment-level timestamps for precise navigation
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-2xl text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Speaker diarization</h3>
                  <p className="text-sm text-neutral-600">
                    Identify and label different speakers in conversations
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-2xl text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Noise reduction</h3>
                  <p className="text-sm text-neutral-600">
                    Robust handling of background noise and poor audio quality
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-2xl text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">Multiple formats</h3>
                  <p className="text-sm text-neutral-600">
                    Support for various audio formats: MP3, M4A, WAV, FLAC, and more
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle" className="text-2xl text-green-600 shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium text-stone-600 mb-1">API & CLI</h3>
                  <p className="text-sm text-neutral-600">
                    Use via command-line interface or integrate into your applications
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Model sizes</h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-3xl mx-auto">
              Choose the right model size for your needs. Larger models provide better accuracy, smaller models are
              faster.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <h3 className="font-serif text-lg text-stone-600 mb-2">Tiny & Base</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Fast transcription for quick notes and simple use cases
                </p>
                <div className="text-xs text-neutral-500">
                  ~39M - 74M parameters
                </div>
              </div>
              <div className="p-6 border-2 border-stone-300 rounded-lg bg-stone-50">
                <div className="text-xs font-semibold text-stone-600 uppercase tracking-wider mb-2">
                  Recommended
                </div>
                <h3 className="font-serif text-lg text-stone-600 mb-2">Small & Medium</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Best balance of speed and accuracy for most use cases
                </p>
                <div className="text-xs text-neutral-500">
                  ~244M - 769M parameters
                </div>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <h3 className="font-serif text-lg text-stone-600 mb-2">Large</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Maximum accuracy for critical transcriptions and research
                </p>
                <div className="text-xs text-neutral-500">
                  ~1550M parameters
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">Use cases</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:video" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Meeting transcription</h3>
                <p className="text-sm text-neutral-600">
                  Transcribe recorded meetings and video calls with high accuracy
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:podcast" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Podcast transcripts</h3>
                <p className="text-sm text-neutral-600">
                  Generate searchable transcripts for podcast episodes
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:school" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Lecture notes</h3>
                <p className="text-sm text-neutral-600">
                  Convert recorded lectures and educational content to text
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-voice" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Interview transcription</h3>
                <p className="text-sm text-neutral-600">
                  Transcribe interviews for research and journalism
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:subtitles" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Subtitle generation</h3>
                <p className="text-sm text-neutral-600">
                  Create subtitles and captions for videos automatically
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:microphone" className="text-2xl text-stone-600 mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Voice memos</h3>
                <p className="text-sm text-neutral-600">
                  Convert voice recordings to searchable text notes
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-4 text-center">
              Open source & community-driven
            </h2>
            <p className="text-lg text-neutral-600 mb-8 text-center max-w-2xl mx-auto">
              OWhisper is open source and maintained by the Hyprnote team and community contributors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/fastrepl/owhisper"
                target="_blank"
                rel="noopener noreferrer"
                className={cn([
                  "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                  "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                  "hover:scale-105 active:scale-95 transition-transform",
                ])}
              >
                <Icon icon="mdi:github" />
                <span>View on GitHub</span>
              </a>
              <a
                href="https://hyprnote.com/download"
                className={cn([
                  "inline-flex items-center justify-center gap-2 px-8 py-3 text-base font-medium rounded-full",
                  "border border-neutral-300 text-stone-600",
                  "hover:bg-white transition-colors",
                ])}
              >
                <span>Try in Hyprnote</span>
              </a>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Powered by Hyprnote
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              OWhisper is the transcription engine that powers Hyprnote's local AI notetaking. Experience it in action.
            </p>
            <a
              href="https://hyprnote.com/download"
              className={cn([
                "inline-block px-8 py-3 text-base font-medium rounded-full",
                "bg-linear-to-t from-stone-600 to-stone-500 text-white",
                "hover:scale-105 active:scale-95 transition-transform",
              ])}
            >
              Download Hyprnote
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
