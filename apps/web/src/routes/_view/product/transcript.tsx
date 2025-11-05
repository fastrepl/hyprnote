import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_view/product/transcript")({
  component: Component,
  head: () => ({
    meta: [
      { title: "Automatic Transcription - Hyprnote" },
      {
        name: "description",
        content:
          "Get accurate, searchable transcripts of all your conversations. Hyprnote automatically transcribes meetings, interviews, and calls.",
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
              Every word,
              <br />
              automatically transcribed
            </h1>
            <p className="text-xl lg:text-2xl text-neutral-600 leading-relaxed max-w-3xl">
              Never miss what was said. Hyprnote creates accurate, searchable transcripts of every conversation -
              automatically and privately.
            </p>
          </header>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">Transcription features</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:text-recognition" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">High accuracy</h3>
                <p className="text-neutral-600">
                  Powered by Whisper AI, our transcription achieves professional-grade accuracy even with accents,
                  technical terms, and multiple speakers.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:account-multiple" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Speaker identification</h3>
                <p className="text-neutral-600">
                  Automatically identifies different speakers in your conversation, making transcripts easy to follow
                  and reference.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:clock-fast" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Timestamps</h3>
                <p className="text-neutral-600">
                  Every sentence includes precise timestamps, so you can quickly jump to any moment in the recording.
                </p>
              </div>
              <div className="p-6 border border-neutral-200 rounded-lg bg-white">
                <Icon icon="mdi:magnify" className="text-3xl text-stone-600 mb-4" />
                <h3 className="text-xl font-serif text-stone-600 mb-2">Fully searchable</h3>
                <p className="text-neutral-600">
                  Search across all your transcripts to find specific topics, names, or quotes in seconds.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20 bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12">
            <h2 className="text-3xl font-serif text-stone-600 mb-8 text-center">
              Use transcripts to
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <Icon icon="mdi:clipboard-text" className="text-4xl text-stone-600 mx-auto mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Create meeting notes</h3>
                <p className="text-sm text-neutral-600">
                  Extract key points and decisions from transcripts
                </p>
              </div>
              <div className="text-center">
                <Icon icon="mdi:file-document-edit" className="text-4xl text-stone-600 mx-auto mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Write articles</h3>
                <p className="text-sm text-neutral-600">
                  Turn interviews into blog posts and articles
                </p>
              </div>
              <div className="text-center">
                <Icon icon="mdi:share-variant" className="text-4xl text-stone-600 mx-auto mb-3" />
                <h3 className="font-medium text-stone-600 mb-2">Share with team</h3>
                <p className="text-sm text-neutral-600">
                  Distribute accurate records to stakeholders
                </p>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <h2 className="text-3xl font-serif text-stone-600 mb-8">How it works</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-stone-600 text-white flex items-center justify-center font-medium">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-1">Record your conversation</h3>
                  <p className="text-neutral-600">
                    Hyprnote captures both microphone and system audio during your meeting or call.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-stone-600 text-white flex items-center justify-center font-medium">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-1">Automatic transcription</h3>
                  <p className="text-neutral-600">
                    After recording, our local AI processes the audio and generates a complete transcript.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-stone-600 text-white flex items-center justify-center font-medium">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-serif text-stone-600 mb-1">Review and edit</h3>
                  <p className="text-neutral-600">
                    Review your transcript, make corrections if needed, and export in various formats.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-stone-50 border border-neutral-200 rounded-lg p-8 lg:p-12 text-center">
            <h2 className="text-3xl font-serif text-stone-600 mb-4">
              Start transcribing automatically
            </h2>
            <p className="text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
              Get accurate transcripts of all your conversations with Hyprnote.
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
