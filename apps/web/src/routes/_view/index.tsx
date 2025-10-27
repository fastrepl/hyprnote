import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";

import { DownloadButton } from "@/components/download-button";
import { GitHubOpenSource } from "@/components/github-open-source";
import { GithubStars } from "@/components/github-stars";
import { LogoCloud } from "@/components/logo-cloud";
import { SocialCard } from "@/components/social-card";
import { VideoModal } from "@/components/video-modal";
import { VideoPlayer } from "@/components/video-player";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { useState } from "react";

export const Route = createFileRoute("/_view/")({
  component: Component,
});

function Component() {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const MUX_PLAYBACK_ID = "SGv6JaZsKqF50102xk6no2ybUqqSyngeWO401ic8qJdZR4";
  return (
    <main className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        {/* Announcement Banner */}
        <a
          href="https://www.ycombinator.com/companies/hyprnote"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <div
            className={cn(
              "flex items-center justify-center gap-2 text-center",
              "bg-stone-50/70 border-b border-stone-100",
              "py-3 px-4",
              "font-serif text-sm text-stone-700",
              "hover:bg-stone-50 transition-all",
            )}
          >
            <span className="group-hover:font-medium">Backed by</span>
            <img
              src="/icons/yc_stone.svg"
              alt="Y Combinator"
              className={cn("h-4 w-4 inline-block group-hover:scale-105")}
            />
            <span className="group-hover:font-medium">Y Combinator</span>
          </div>
        </a>

        <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
          <div className="flex flex-col items-center text-center">
            <section className="flex flex-col items-center text-center gap-12 py-24">
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
            <div className="relative aspect-video w-full max-w-4xl border-t border-neutral-100 md:hidden overflow-hidden">
              <VideoThumbnail
                playbackId={MUX_PLAYBACK_ID}
                onPlay={() => setExpandedVideo(MUX_PLAYBACK_ID)}
              />
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
              <div className="relative aspect-video w-full border-t border-neutral-100 hidden md:block overflow-hidden">
                <VideoThumbnail
                  playbackId={MUX_PLAYBACK_ID}
                  onPlay={() => setExpandedVideo(MUX_PLAYBACK_ID)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof Section */}
        <section className="border-t border-neutral-100">
          <div className="text-center">
            <p className="font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
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
                      url="https://www.linkedin.com/posts/flaviews_guys-at-hyprnote-yc-s25-are-wild-had-activity-7360606765530386434-Klj-"
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
                    url="https://www.linkedin.com/posts/flaviews_guys-at-hyprnote-yc-s25-are-wild-had-activity-7360606765530386434-Klj-"
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

        {/* Features Section */}
        <section>
          <div className="text-center py-16">
            <div className="mb-6 mx-auto size-28 shadow-xl border border-neutral-100 flex justify-center items-center rounded-4xl bg-transparent">
              <img
                src="/hyprnote/icon.png"
                alt="Hyprnote"
                className="size-24 rounded-3xl border border-neutral-100"
              />
            </div>
            <h2 className="text-3xl font-serif text-stone-600 mb-4">Hyprnote works like charm</h2>
            <p className="text-neutral-600 max-w-lg mx-auto">
              {"Super simple and easy to use with its clean interface. And it's getting better with every update — every single week."}
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-6 gap-4 px-4 pb-4">
            {/* Row 1: Transcript + Summary */}
            {/* Transcript Feature - span 3 */}
            <div className="col-span-6 md:col-span-3 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
              <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                <VideoPlayer
                  playbackId={MUX_PLAYBACK_ID}
                  onLearnMore={() => window.location.href = "#"}
                  onExpandVideo={() => setExpandedVideo(MUX_PLAYBACK_ID)}
                />
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Icon icon="mdi:text-box-outline" className="text-2xl text-stone-600" />
                  <h3 className="text-lg font-serif text-stone-600">Transcript</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Realtime transcript and speaker identification
                </p>
              </div>
            </div>

            {/* Summary Feature - span 3 */}
            <div className="col-span-6 md:col-span-3 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
              <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                <VideoPlayer
                  playbackId={MUX_PLAYBACK_ID}
                  onLearnMore={() => window.location.href = "#"}
                  onExpandVideo={() => setExpandedVideo(MUX_PLAYBACK_ID)}
                />
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Icon icon="mdi:file-document-outline" className="text-2xl text-stone-600" />
                  <h3 className="text-lg font-serif text-stone-600">Summary</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Create customized summaries with templates for various formats
                </p>
              </div>
            </div>

            {/* Row 2: Chat + Floating Panel + Daily Note */}
            {/* Chat Feature - span 2 */}
            <div className="col-span-6 md:col-span-2 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
              <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                <VideoPlayer
                  playbackId={MUX_PLAYBACK_ID}
                  onLearnMore={() => window.location.href = "#"}
                  onExpandVideo={() => setExpandedVideo(MUX_PLAYBACK_ID)}
                />
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Icon icon="mdi:chat-outline" className="text-2xl text-stone-600" />
                  <h3 className="text-lg font-serif text-stone-600">Chat</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Get context-aware answers in realtime, even from past meetings
                </p>
              </div>
            </div>

            {/* Floating Panel Feature - span 2 */}
            <div className="col-span-6 md:col-span-2 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
              <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                <VideoPlayer
                  playbackId={MUX_PLAYBACK_ID}
                  onLearnMore={() => window.location.href = "#"}
                  onExpandVideo={() => setExpandedVideo(MUX_PLAYBACK_ID)}
                />
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Icon icon="mdi:window-restore" className="text-2xl text-stone-600" />
                  <h3 className="text-lg font-serif text-stone-600">Floating Panel</h3>
                </div>
                <p className="text-sm text-neutral-600">
                  Compact notepad with transcript, summary, and chat during meetings
                </p>
              </div>
            </div>

            {/* Daily Note Feature - span 2 */}
            <div className="col-span-6 md:col-span-2 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
              <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                <img src="/static.gif" alt="Daily Note feature" className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Icon icon="mdi:calendar-check-outline" className="text-2xl text-stone-600" />
                  <h3 className="text-lg font-serif text-stone-600">Daily Note</h3>
                  <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-neutral-600">
                  Track todos and navigate emails and events throughout the day
                </p>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="border-t border-neutral-100">
            <div className="text-center py-12 px-6">
              <h2 className="text-3xl font-serif text-stone-600 mb-4">We focus on every bit of details</h2>
              <p className="text-neutral-600 max-w-lg mx-auto">
                From powerful editing to seamless organization, every feature is crafted with care
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 border-t border-neutral-100">
              {/* Details List */}
              <div className="border-b md:border-b-0 md:border-r border-neutral-100">
                {/* Notion-like Editor */}
                <div className="p-6 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:text-box-edit-outline" className="text-2xl text-stone-600 mt-0.5" />
                    <div>
                      <h3 className="text-base font-serif font-medium text-stone-600 mb-1">Notion-like Editor</h3>
                      <p className="text-sm text-neutral-600">
                        Full markdown support with distraction-free writing
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Audio */}
                <div className="p-6 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:upload-outline" className="text-2xl text-stone-600 mt-0.5" />
                    <div>
                      <h3 className="text-base font-serif font-medium text-stone-600 mb-1">Upload Audio</h3>
                      <p className="text-sm text-neutral-600">
                        Import audio files or transcripts to convert into notes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contacts View */}
                <div className="p-6 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:account-multiple-outline" className="text-2xl text-stone-600 mt-0.5" />
                    <div>
                      <h3 className="text-base font-serif font-medium text-stone-600 mb-1">Contacts View</h3>
                      <p className="text-sm text-neutral-600">
                        Organize and manage your contacts with ease
                      </p>
                    </div>
                  </div>
                </div>

                {/* Calendar View */}
                <div className="p-6 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:calendar-outline" className="text-2xl text-stone-600 mt-0.5" />
                    <div>
                      <h3 className="text-base font-serif font-medium text-stone-600 mb-1">Calendar View</h3>
                      <p className="text-sm text-neutral-600">
                        Stay on top of your schedule with integrated calendar
                      </p>
                    </div>
                  </div>
                </div>

                {/* Noteshelf View */}
                <div className="p-6 hover:bg-neutral-50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <Icon icon="mdi:bookshelf" className="text-2xl text-stone-600 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-serif font-medium text-stone-600">Noteshelf View</h3>
                        <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        Browse and organize all your notes in one place
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Preview */}
              <div className="aspect-video md:aspect-auto border-neutral-100 overflow-hidden">
                <VideoPlayer
                  playbackId={MUX_PLAYBACK_ID}
                  onLearnMore={() => window.location.href = "#"}
                  onExpandVideo={() => setExpandedVideo(MUX_PLAYBACK_ID)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <GitHubOpenSource />

        {/* Manifesto Section */}
        <section className="py-16 border-t border-neutral-100 px-4">
          <div className="max-w-4xl mx-auto">
            <div
              className="border border-neutral-200 p-4"
              style={{ backgroundImage: "url(/patterns/white_leather.png)" }}
            >
              {/* Postcard */}
              <div
                className="bg-stone-50 border border-neutral-200 rounded-sm p-8 sm:p-12"
                style={{ backgroundImage: "url(/patterns/paper.png)" }}
              >
                <h2 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-4">Our manifesto</h2>

                <div className="space-y-4 text-neutral-700 leading-relaxed">
                  <p>
                    We believe in the power of notetaking, not notetakers. Meetings should be moments of presence, not
                    passive attendance. If you are not adding value, your time is better spent elsewhere for you and
                    your team.
                  </p>
                  <p>
                    Hyprnote exists to preserve what makes us human: conversations that spark ideas, collaborations that
                    move work forward. We build tools that amplify human agency, not replace it. No ghost bots. No
                    silent note lurkers. Just people, thinking together.
                  </p>
                  <p>We stand with those who value real connection and purposeful collaboration.</p>
                </div>

                {/* Team photos */}
                <div className="flex gap-2 mt-12 mb-4">
                  <img
                    src="/team/john.png"
                    alt="John Jeong"
                    className="size-8 rounded-full object-cover border border-neutral-200"
                  />
                  <img
                    src="/team/yujong.png"
                    alt="Yujong Lee"
                    className="size-8 rounded-full object-cover border border-neutral-200"
                  />
                </div>

                {/* Team names and signature */}
                <div className="space-y-4">
                  <div>
                    <p className="text-base text-neutral-600 font-medium italic font-serif">Hyprnote</p>
                    <p className="text-sm text-neutral-500">John Jeong, Yujong Lee</p>
                  </div>

                  {/* Signature SVG */}
                  <div>
                    <img
                      src="/hyprnote/signature.svg"
                      alt="Hyprnote Signature"
                      className="w-32 h-auto opacity-80"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-neutral-100 bg-linear-to-t from-stone-50/30 to-stone-100/30">
          <div className="flex flex-col gap-6 items-center">
            <div className="mb-4 size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
              <img
                src="/hyprnote/icon.png"
                alt="Hyprnote"
                className="size-36 mx-auto rounded-[40px] border border-neutral-100"
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif">
              Where conversations stay yours
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Start using Hyprnote today and bring clarity to your back-to-back meetings
            </p>
            <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <DownloadButton />
              <GithubStars />
            </div>
          </div>
        </section>
      </div>

      {/* Video Modal */}
      <VideoModal
        playbackId={expandedVideo || ""}
        isOpen={expandedVideo !== null}
        onClose={() => setExpandedVideo(null)}
      />
    </main>
  );
}
