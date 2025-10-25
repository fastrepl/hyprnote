import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

import { DownloadButton } from "@/components/download-button";
import { GithubStars } from "@/components/github-stars";
import { LogoCloud } from "@/components/logo-cloud";
import { SocialCard } from "@/components/social-card";

export const Route = createFileRoute("/_view/")({
  component: Component,
});

function Component() {
  return (
    <div>
      <main className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen">
        <div className="max-w-6xl mx-auto py-12 border-x border-neutral-100">
          <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
            <div className="flex flex-col items-center text-center">
              <section className="flex flex-col items-center text-center gap-12 pt-12 pb-24">
                <div className="space-y-6 max-w-4xl">
                  <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
                    The AI notepad for <br className="block sm:hidden" />private meetings
                  </h1>
                  <p className="text-lg sm:text-xl text-neutral-600">
                    Hyprnote listens and summarizes your meetings{" "}
                    <br className="hidden sm:block" />without sending any voice to remote servers
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <DownloadButton />
                  <p className="text-neutral-500">
                    Free and{" "}
                    <a
                      className="decoration-dotted underline hover:text-stone-600 transition-all"
                      href="https://github.com/fastrepl/hyprnote"
                      target="_blank"
                    >
                      open source
                    </a>
                  </p>
                </div>
              </section>

              {/* Video - Mobile First */}
              <div className="relative aspect-video w-full max-w-4xl bg-linear-to-br from-stone-50 to-neutral-50 border-t border-neutral-100 md:hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Icon icon="mdi:play-circle-outline" className="text-6xl text-neutral-400 mx-auto" />
                    <p className="text-neutral-500 font-medium">Demo video coming soon</p>
                  </div>
                </div>
              </div>

              {/* Feature Cards Row */}
              <div className="w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 border-t border-neutral-100">
                  <div className="p-6 text-left border-b md:border-b-0 md:border-r border-neutral-100">
                    <h3 className="font-medium mb-1 text-neutral-900 font-mono">Private</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Your notes stay local by default. Sync to a cloud only when you choose.
                    </p>
                  </div>
                  <div className="p-6 text-left border-b md:border-b-0 md:border-r border-neutral-100">
                    <h3 className="font-medium mb-1 text-neutral-900 font-mono">Effortless</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      A simple notepad that just works—fast, minimal, and distraction-free.
                    </p>
                  </div>
                  <div className="p-6 text-left">
                    <h3 className="font-medium mb-1 text-neutral-900 font-mono">Flexible</h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      Use any STT or LLM. Local or cloud. No lock-ins, no forced stack.
                    </p>
                  </div>
                </div>

                {/* Video - Desktop (no gap) */}
                <div className="relative aspect-video w-full bg-white border-t border-neutral-100 hidden md:block">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Icon icon="mdi:play-circle-outline" className="text-6xl text-neutral-400 mx-auto" />
                      <p className="text-neutral-500 font-medium">Demo video coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Section */}
          <section className="border-t border-neutral-100">
            <div className="text-center">
              <p className="text-sm font-medium text-neutral-600 uppercase tracking-wide py-6">
                Loved by professionals at
              </p>

              <LogoCloud />

              {/* Testimonials - New Grid Layout */}
              <div className="w-full">
                {/* Mobile: Horizontal scrollable layout */}
                <div className="md:hidden overflow-x-auto pb-4">
                  <div className="flex w-max">
                    <div className="shrink-0">
                      <SocialCard
                        platform="reddit"
                        author="spilledcarryout"
                        subreddit="macapps"
                        body="Dear Hyprnote Team,

I wanted to take a moment to commend you on the impressive work you've done with Hyprnote. Your commitment to privacy, on-device AI, and transparency is truly refreshing in today's software landscape. The fact that all transcription and summarization happens locally and live!—without compromising data security—makes Hyprnote a standout solution, especially for those of us in compliance-sensitive environments.

The live transcription is key for me. It saves a landmark step to transcribe each note myself using macwhisper. Much more handy they way you all do this. The Calendar function is cool too.

I am a telephysician and my notes are much more quickly done. Seeing 6-8 patients daily and tested it yesteday. So yes, my job is session heavy. Add to that being in psychiatry where document making sessions become voluminous, my flow is AI dependent to make reports stand out. Accuracy is key for patient care.

Hyprnote is now part of that process.

Thank you for your dedication and for building a tool that not only saves time, but also gives peace of mind. I look forward to seeing Hyprnote continue to evolve

Cheers!"
                        url="https://www.reddit.com/r/macapps/comments/1lo24b9/comment/n15dr0t/"
                        className="w-80 border-x-0"
                      />
                    </div>

                    <div className="shrink-0">
                      <SocialCard
                        platform="linkedin"
                        author="Flavius Catalin Miron"
                        role="Product Engineer"
                        company="Waveful"
                        body="Guys at Hyprnote (YC S25) are wild.

Had a call with John Jeong about their product (privacy-first AI notepad).

Next day? They already shipped a first version of the context feature we discussed 🤯

24 𝐡𝐨𝐮𝐫𝐬. A conversation turned into production

As Product Engineer at Waveful, where we also prioritize rapid execution, I deeply respect this level of speed.

The ability to ship this fast while maintaining quality, is what separates great teams from the rest 🔥

Btw give an eye to Hyprnote:
100% local AI processing
Zero cloud dependency
Real privacy
Almost daily releases

Their repo: https://lnkd.in/dKCtxkA3 (mac only rn but they're releasing for windows very soon)

Been using it for daily tasks, even simple note-taking is GREAT because I can review everything late, make action points etc.

Mad respect to the team. This is how you build in 2025. 🚀"
                        url="https://www.linkedin.com/in/flaviews/"
                        className="w-80 border-x-0"
                      />
                    </div>

                    <div className="shrink-0">
                      <SocialCard
                        platform="twitter"
                        author="yoran was here"
                        username="yoran_beisher"
                        body="Been using Hypernote for a while now, truly one of the best AI apps I've used all year. Like they said, the best thing since sliced bread"
                        url="https://x.com/yoran_beisher/status/1953147865486012611"
                        className="w-80 border-x-0"
                      />
                    </div>

                    <div className="shrink-0">
                      <SocialCard
                        platform="twitter"
                        author="Tom Yang"
                        username="tomyang11_"
                        body="I love the flexibility that @tryhyprnote gives me to integrate personal notes with AI summaries. I can quickly jot down important points during the meeting without getting distracted, then trust that the AI will capture them in full detail for review afterwards."
                        url="https://twitter.com/tomyang11_/status/1956395933538902092"
                        className="w-80 border-x-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop: Custom grid layout with big and small cards */}
                <div className="hidden md:grid md:grid-cols-3">
                  {/* Left column - Big card (row-span-2) */}
                  <div className="row-span-2">
                    <SocialCard
                      platform="reddit"
                      author="spilledcarryout"
                      subreddit="macapps"
                      body="Dear Hyprnote Team,

I wanted to take a moment to commend you on the impressive work you've done with Hyprnote. Your commitment to privacy, on-device AI, and transparency is truly refreshing in today's software landscape. The fact that all transcription and summarization happens locally and live!—without compromising data security—makes Hyprnote a standout solution, especially for those of us in compliance-sensitive environments.

The live transcription is key for me. It saves a landmark step to transcribe each note myself using macwhisper. Much more handy they way you all do this. The Calendar function is cool too.

I am a telephysician and my notes are much more quickly done. Seeing 6-8 patients daily and tested it yesteday. So yes, my job is session heavy. Add to that being in psychiatry where document making sessions become voluminous, my flow is AI dependent to make reports stand out. Accuracy is key for patient care.

Hyprnote is now part of that process.

Thank you for your dedication and for building a tool that not only saves time, but also gives peace of mind. I look forward to seeing Hyprnote continue to evolve

Cheers!"
                      url="https://www.reddit.com/r/macapps/comments/1lo24b9/comment/n15dr0t/"
                      className="w-full h-full border-l-0 border-r-0"
                    />
                  </div>

                  {/* Middle column - Big card (row-span-2) */}
                  <div className="row-span-2">
                    <SocialCard
                      platform="linkedin"
                      author="Flavius Catalin Miron"
                      role="Product Engineer"
                      company="Waveful"
                      body="Guys at Hyprnote (YC S25) are wild.

Had a call with John Jeong about their product (privacy-first AI notepad).

Next day? They already shipped a first version of the context feature we discussed 🤯

24 𝐡𝐨𝐮𝐫𝐬. A conversation turned into production

As Product Engineer at Waveful, where we also prioritize rapid execution, I deeply respect this level of speed.

The ability to ship this fast while maintaining quality, is what separates great teams from the rest 🔥

Btw give an eye to Hyprnote:
100% local AI processing
Zero cloud dependency
Real privacy
Almost daily releases

Their repo: https://lnkd.in/dKCtxkA3 (mac only rn but they're releasing for windows very soon)

Been using it for daily tasks, even simple note-taking is GREAT because I can review everything late, make action points etc.

Mad respect to the team. This is how you build in 2025. 🚀"
                      url="https://www.linkedin.com/in/flaviews/"
                      className="w-full h-full border-r-0"
                    />
                  </div>

                  {/* Right column - Small card (top) */}
                  <div className="h-[260px]">
                    <SocialCard
                      platform="twitter"
                      author="yoran was here"
                      username="yoran_beisher"
                      body="Been using Hypernote for a while now, truly one of the best AI apps I've used all year. Like they said, the best thing since sliced bread"
                      url="https://x.com/yoran_beisher/status/1953147865486012611"
                      className="w-full h-full overflow-hidden border-r-0 border-b-0"
                    />
                  </div>

                  {/* Right column - Small card (bottom) */}
                  <div className="h-[260px]">
                    <SocialCard
                      platform="twitter"
                      author="Tom Yang"
                      username="tomyang11_"
                      body="I love the flexibility that @tryhyprnote gives me to integrate personal notes with AI summaries. I can quickly jot down important points during the meeting without getting distracted, then trust that the AI will capture them in full detail for review afterwards."
                      url="https://twitter.com/tomyang11_/status/1956395933538902092"
                      className="w-full h-full overflow-hidden border-r-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 text-center">
            <div className="space-y-6 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-serif">
                Built for developers
              </h2>
              <div className="grid gap-3 pt-2">
                {[
                  "AI-powered search and organization",
                  "Local-first, fast performance",
                  "Clean, distraction-free UI",
                  "Open source & privacy-focused",
                ].map((item, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-3 p-3 rounded-lg hover:bg-stone-50/30 transition-all duration-200"
                  >
                    <svg
                      className="h-5 w-5 flex-none text-stone-600 mt-0.5 group-hover:scale-110 transition-transform"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-base leading-relaxed text-neutral-700 text-left">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-24 border-t border-neutral-100">
            <div className="space-y-6 text-center">
              <h2 className="text-2xl sm:text-3xl font-serif">
                Where conversations stay yours
              </h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                Start using Hyprnote today and bring clarity to your back-to-back meetings
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <DownloadButton />
                <GithubStars />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
