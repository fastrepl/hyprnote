import { cn } from "@hypr/utils";

import { Icon } from "@iconify-icon/react";
import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { DownloadButton } from "@/components/download-button";
import { GitHubOpenSource } from "@/components/github-open-source";
import { GithubStars } from "@/components/github-stars";
import { JoinWaitlistButton } from "@/components/join-waitlist-button";
import { LogoCloud } from "@/components/logo-cloud";
import { SocialCard } from "@/components/social-card";
import { VideoModal } from "@/components/video-modal";
import { VideoPlayer } from "@/components/video-player";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { getHeroCTA, getPlatformCTA, usePlatform } from "@/hooks/use-platform";
import { useHeroContext } from "./route";

const MUX_PLAYBACK_ID = "bpcBHf4Qv5FbhwWD02zyFDb24EBuEuTPHKFUrZEktULQ";

const mainFeatures = [
  {
    icon: "mdi:text-box-outline",
    title: "Transcript",
    description: "Realtime transcript and speaker identification",
    videoType: "player" as const,
  },
  {
    icon: "mdi:file-document-outline",
    title: "Summary",
    description: "Create customized summaries with templates for various formats",
    videoType: "player" as const,
  },
  {
    icon: "mdi:chat-outline",
    title: "Chat",
    description: "Get context-aware answers in realtime, even from past meetings",
    videoType: "player" as const,
  },
  {
    icon: "mdi:window-restore",
    title: "Floating Panel",
    description: "Compact notepad with transcript, summary, and chat during meetings",
    videoType: "player" as const,
  },
  {
    icon: "mdi:calendar-check-outline",
    title: "Daily Note",
    description: "Track todos and navigate emails and events throughout the day",
    videoType: "image" as const,
    comingSoon: true,
  },
];

const detailsFeatures = [
  {
    icon: "mdi:text-box-edit-outline",
    title: "Notion-like Editor",
    description: "Full markdown support with distraction-free writing",
    comingSoon: false,
  },
  {
    icon: "mdi:upload-outline",
    title: "Upload Audio",
    description: "Import audio files or transcripts to convert into notes",
    comingSoon: false,
  },
  {
    icon: "mdi:account-multiple-outline",
    title: "Contacts",
    description: "Organize and manage your contacts with ease",
    comingSoon: false,
  },
  {
    icon: "mdi:calendar-outline",
    title: "Calendar",
    description: "Stay on top of your schedule with integrated calendar",
    comingSoon: false,
  },
  {
    icon: "mdi:bookshelf",
    title: "Noteshelf",
    description: "Browse and organize all your notes in one place",
    comingSoon: true,
  },
];

export const Route = createFileRoute("/_view/")({
  component: Component,
});

function Component() {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState(0);
  const detailsScrollRef = useRef<HTMLDivElement>(null);
  const featuresScrollRef = useRef<HTMLDivElement>(null);

  const scrollToDetail = (index: number) => {
    setSelectedDetail(index);
    if (detailsScrollRef.current) {
      const container = detailsScrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  const scrollToFeature = (index: number) => {
    setSelectedFeature(index);
    if (featuresScrollRef.current) {
      const container = featuresScrollRef.current;
      const scrollLeft = container.offsetWidth * index;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  };

  return (
    <main className="flex-1 bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen">
      <div className="max-w-6xl mx-auto border-x border-neutral-100">
        <YCombinatorBanner />
        <HeroSection onVideoExpand={setExpandedVideo} />
        <TestimonialsSection />
        <FeaturesIntroSection />
        <MainFeaturesSection
          featuresScrollRef={featuresScrollRef}
          selectedFeature={selectedFeature}
          setSelectedFeature={setSelectedFeature}
          scrollToFeature={scrollToFeature}
          onVideoExpand={setExpandedVideo}
        />
        <DetailsSection
          detailsScrollRef={detailsScrollRef}
          selectedDetail={selectedDetail}
          setSelectedDetail={setSelectedDetail}
          scrollToDetail={scrollToDetail}
          onVideoExpand={setExpandedVideo}
        />
        <GitHubOpenSource />
        <ManifestoSection />
        <CTASection />
      </div>
      <VideoModal
        playbackId={expandedVideo || ""}
        isOpen={expandedVideo !== null}
        onClose={() => setExpandedVideo(null)}
      />
    </main>
  );
}

function YCombinatorBanner() {
  return (
    <a
      href="https://www.ycombinator.com/companies/hyprnote"
      target="_blank"
      rel="noopener noreferrer"
      className="group"
    >
      <div
        className={cn([
          "flex items-center justify-center gap-2 text-center",
          "bg-stone-50/70 border-b border-stone-100",
          "py-3 px-4",
          "font-serif text-sm text-stone-700",
          "hover:bg-stone-50 transition-all",
        ])}
      >
        <span className="group-hover:font-medium">Backed by</span>
        <img
          src="/icons/yc_stone.svg"
          alt="Y Combinator"
          className="h-4 w-4 inline-block group-hover:scale-105"
        />
        <span className="group-hover:font-medium">Y Combinator</span>
      </div>
    </a>
  );
}

function HeroSection({ onVideoExpand }: { onVideoExpand: (id: string) => void }) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30">
      <div className="flex flex-col items-center text-center">
        <section className="flex flex-col items-center text-center gap-12 py-24 px-4 laptop:px-0">
          <div className="space-y-6 max-w-4xl">
            <h1 className="text-4xl sm:text-5xl font-serif tracking-tight text-stone-600">
              The AI notepad for <br className="block sm:hidden" />private meetings
            </h1>
            <p className="text-lg sm:text-xl text-neutral-600">
              Hyprnote listens and summarizes your meetings{" "}
              <br className="hidden sm:block" />without sending any voice to remote servers
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <JoinWaitlistButton />
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

        <div className="relative aspect-video w-full max-w-4xl border-t border-neutral-100 md:hidden overflow-hidden">
          <VideoThumbnail
            playbackId={MUX_PLAYBACK_ID}
            onPlay={() => onVideoExpand(MUX_PLAYBACK_ID)}
          />
        </div>

        <div className="w-full">
          <ValuePropsGrid />
          <div className="relative aspect-video w-full border-t border-neutral-100 hidden md:block overflow-hidden">
            <VideoThumbnail
              playbackId={MUX_PLAYBACK_ID}
              onPlay={() => onVideoExpand(MUX_PLAYBACK_ID)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ValuePropsGrid() {
  return (
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
  );
}

function TestimonialsSection() {
  return (
    <section className="border-t border-neutral-100">
      <div className="text-center">
        <p className="font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
          Loved by professionals at
        </p>

        <LogoCloud />

        <div className="w-full">
          <TestimonialsMobileGrid />
          <TestimonialsDesktopGrid />
        </div>
      </div>
    </section>
  );
}

function TestimonialsMobileGrid() {
  return (
    <div className="md:hidden flex flex-col">
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
        className="border-x-0"
      />

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
        className="border-x-0"
      />

      <SocialCard
        platform="twitter"
        author="yoran was here"
        username="yoran_beisher"
        body="Been using Hypernote for a while now, truly one of the best AI apps I've used all year. Like they said, the best thing since sliced bread"
        url="https://x.com/yoran_beisher/status/1953147865486012611"
        className="border-x-0"
      />

      <SocialCard
        platform="twitter"
        author="Tom Yang"
        username="tomyang11_"
        body="I love the flexibility that @tryhyprnote gives me to integrate personal notes with AI summaries. I can quickly jot down important points during the meeting without getting distracted, then trust that the AI will capture them in full detail for review afterwards."
        url="https://twitter.com/tomyang11_/status/1956395933538902092"
        className="border-x-0"
      />
    </div>
  );
}

function TestimonialsDesktopGrid() {
  return (
    <div className="hidden md:grid md:grid-cols-3">
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
  );
}

function FeaturesIntroSection() {
  return (
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
    </section>
  );
}

function MainFeaturesSection({
  featuresScrollRef,
  selectedFeature,
  setSelectedFeature,
  scrollToFeature,
  onVideoExpand,
}: {
  featuresScrollRef: React.RefObject<HTMLDivElement | null>;
  selectedFeature: number;
  setSelectedFeature: (index: number) => void;
  scrollToFeature: (index: number) => void;
  onVideoExpand: (id: string) => void;
}) {
  return (
    <>
      <FeaturesMobileCarousel
        featuresScrollRef={featuresScrollRef}
        selectedFeature={selectedFeature}
        setSelectedFeature={setSelectedFeature}
        scrollToFeature={scrollToFeature}
        onVideoExpand={onVideoExpand}
      />
      <FeaturesDesktopGrid onVideoExpand={onVideoExpand} />
    </>
  );
}

function FeaturesMobileCarousel({
  featuresScrollRef,
  selectedFeature,
  setSelectedFeature,
  scrollToFeature,
  onVideoExpand,
}: {
  featuresScrollRef: React.RefObject<HTMLDivElement | null>;
  selectedFeature: number;
  setSelectedFeature: (index: number) => void;
  scrollToFeature: (index: number) => void;
  onVideoExpand: (id: string) => void;
}) {
  return (
    <div className="max-[800px]:block hidden px-4">
      <div
        ref={featuresScrollRef}
        className="overflow-x-auto snap-x snap-mandatory scrollbar-hide scrollbar-none -mx-4"
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollLeft = container.scrollLeft;
          const itemWidth = container.offsetWidth;
          const index = Math.round(scrollLeft / itemWidth);
          setSelectedFeature(index);
        }}
      >
        <div className="flex">
          {mainFeatures.map((feature, index) => (
            <div key={index} className="w-full shrink-0 snap-center px-4">
              <div className="border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
                <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                  {feature.videoType === "player"
                    ? (
                      <VideoPlayer
                        playbackId={MUX_PLAYBACK_ID}
                        onLearnMore={() => window.location.href = "#"}
                        onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
                      />
                    )
                    : (
                      <img
                        src="/static.gif"
                        alt={`${feature.title} feature`}
                        className="w-full h-full object-cover"
                      />
                    )}
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-serif text-stone-600">{feature.title}</h3>
                    {feature.comingSoon && (
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 py-6">
        {mainFeatures.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToFeature(index)}
            className={cn([
              "h-1 rounded-full transition-all cursor-pointer",
              selectedFeature === index
                ? "w-8 bg-stone-600"
                : "w-8 bg-neutral-300 hover:bg-neutral-400",
            ])}
            aria-label={`Go to feature ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function FeaturesDesktopGrid({ onVideoExpand }: { onVideoExpand: (id: string) => void }) {
  return (
    <div className="min-[800px]:grid hidden grid-cols-6 gap-4 px-4 laptop:px-0 pb-4">
      <div className="col-span-6 md:col-span-3 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
        <div className="aspect-video border-b border-neutral-100 overflow-hidden">
          <VideoPlayer
            playbackId={MUX_PLAYBACK_ID}
            onLearnMore={() => window.location.href = "#"}
            onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
          />
        </div>
        <div className="p-6 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Icon icon="mdi:text-box-outline" className="text-2xl text-stone-600" />
            <h3 className="text-lg font-serif text-stone-600">Transcript</h3>
          </div>
          <p className="text-sm text-neutral-600">
            Realtime transcript and speaker identification (coming soon)
          </p>
        </div>
      </div>

      <div className="col-span-6 md:col-span-3 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
        <div className="aspect-video border-b border-neutral-100 overflow-hidden">
          <VideoPlayer
            playbackId={MUX_PLAYBACK_ID}
            onLearnMore={() => window.location.href = "#"}
            onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
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

      <div className="col-span-6 md:col-span-2 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
        <div className="aspect-video border-b border-neutral-100 overflow-hidden">
          <VideoPlayer
            playbackId={MUX_PLAYBACK_ID}
            onLearnMore={() => window.location.href = "#"}
            onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
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

      <div className="col-span-6 md:col-span-2 border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
        <div className="aspect-video border-b border-neutral-100 overflow-hidden">
          <VideoPlayer
            playbackId={MUX_PLAYBACK_ID}
            onLearnMore={() => window.location.href = "#"}
            onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
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
  );
}

function DetailsSection({
  detailsScrollRef,
  selectedDetail,
  setSelectedDetail,
  scrollToDetail,
  onVideoExpand,
}: {
  detailsScrollRef: React.RefObject<HTMLDivElement | null>;
  selectedDetail: number;
  setSelectedDetail: (index: number) => void;
  scrollToDetail: (index: number) => void;
  onVideoExpand: (id: string) => void;
}) {
  return (
    <div className="border-t border-neutral-100">
      <DetailsSectionHeader />
      <DetailsMobileCarousel
        detailsScrollRef={detailsScrollRef}
        selectedDetail={selectedDetail}
        setSelectedDetail={setSelectedDetail}
        scrollToDetail={scrollToDetail}
        onVideoExpand={onVideoExpand}
      />
      <DetailsTabletView
        selectedDetail={selectedDetail}
        setSelectedDetail={setSelectedDetail}
        onVideoExpand={onVideoExpand}
      />
      <DetailsDesktopView onVideoExpand={onVideoExpand} />
    </div>
  );
}

function DetailsSectionHeader() {
  return (
    <div className="text-center py-12 px-4 laptop:px-0">
      <h2 className="text-3xl font-serif text-stone-600 mb-4">We focus on every bit of details</h2>
      <p className="text-neutral-600 max-w-lg mx-auto">
        From powerful editing to seamless organization, every feature is crafted with care
      </p>
    </div>
  );
}

function DetailsMobileCarousel({
  detailsScrollRef,
  selectedDetail,
  setSelectedDetail,
  scrollToDetail,
  onVideoExpand,
}: {
  detailsScrollRef: React.RefObject<HTMLDivElement | null>;
  selectedDetail: number;
  setSelectedDetail: (index: number) => void;
  scrollToDetail: (index: number) => void;
  onVideoExpand: (id: string) => void;
}) {
  return (
    <div className="max-[800px]:block hidden border-t border-neutral-100 px-4 laptop:px-0">
      <div
        ref={detailsScrollRef}
        className="overflow-x-auto scrollbar-none snap-x snap-mandatory scrollbar-hide -mx-4"
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollLeft = container.scrollLeft;
          const itemWidth = container.offsetWidth;
          const index = Math.round(scrollLeft / itemWidth);
          setSelectedDetail(index);
        }}
      >
        <div className="flex">
          {detailsFeatures.map((feature, index) => (
            <div key={index} className="w-full shrink-0 snap-center px-4">
              <div className="border border-neutral-100 rounded-sm overflow-hidden flex flex-col">
                <div className="aspect-video border-b border-neutral-100 overflow-hidden">
                  <VideoPlayer
                    playbackId={MUX_PLAYBACK_ID}
                    onLearnMore={() => window.location.href = "#"}
                    onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-serif text-stone-600">{feature.title}</h3>
                    {feature.comingSoon && (
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2 py-6">
        {detailsFeatures.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToDetail(index)}
            className={cn([
              "h-1 rounded-full transition-all cursor-pointer",
              selectedDetail === index
                ? "w-8 bg-stone-600"
                : "w-8 bg-neutral-300 hover:bg-neutral-400",
            ])}
            aria-label={`Go to detail ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function DetailsTabletView({
  selectedDetail,
  setSelectedDetail,
  onVideoExpand,
}: {
  selectedDetail: number;
  setSelectedDetail: (index: number) => void;
  onVideoExpand: (id: string) => void;
}) {
  return (
    <div className="min-[800px]:max-[1200px]:block hidden border-t border-neutral-100 px-4 laptop:px-0">
      <div className="flex flex-col">
        <div className="overflow-x-auto scrollbar-none border-b border-neutral-100">
          <div className="flex">
            {detailsFeatures.map((feature, index) => (
              <button
                key={index}
                onClick={() => setSelectedDetail(index)}
                className={cn(
                  "p-6 border-r border-neutral-100 last:border-r-0 min-w-[280px] text-left transition-colors",
                  selectedDetail === index
                    ? "bg-stone-50"
                    : "hover:bg-neutral-50",
                )}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-serif font-medium text-stone-600">{feature.title}</h3>
                    {feature.comingSoon && (
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600">{feature.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 pb-4">
          <div className="border border-neutral-100 rounded-sm overflow-hidden aspect-video">
            <VideoPlayer
              playbackId={MUX_PLAYBACK_ID}
              onLearnMore={() => window.location.href = "#"}
              onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailsDesktopView({ onVideoExpand }: { onVideoExpand: (id: string) => void }) {
  return (
    <div className="min-[1200px]:grid hidden grid-cols-2 border-t border-neutral-100">
      <div className="border-r border-neutral-100">
        {detailsFeatures.map((feature, index) => (
          <div
            key={index}
            className={cn(
              "p-6 cursor-pointer transition-colors",
              index < detailsFeatures.length - 1 && "border-b border-neutral-100",
              "hover:bg-neutral-50",
            )}
          >
            <div className="flex items-start gap-3">
              <Icon icon={feature.icon} className="text-2xl text-stone-600 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-serif font-medium text-stone-600">{feature.title}</h3>
                  {feature.comingSoon && (
                    <span className="text-xs font-medium text-neutral-500 bg-neutral-200 px-2 py-1 rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-600">{feature.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="aspect-video md:aspect-auto overflow-hidden">
        <VideoPlayer
          playbackId={MUX_PLAYBACK_ID}
          onLearnMore={() => window.location.href = "#"}
          onExpandVideo={() => onVideoExpand(MUX_PLAYBACK_ID)}
        />
      </div>
    </div>
  );
}

function ManifestoSection() {
  return (
    <section className="py-16 border-t border-neutral-100 px-4 laptop:px-0">
      <div className="max-w-4xl mx-auto">
        <div
          className="border border-neutral-200 p-4"
          style={{ backgroundImage: "url(/patterns/white_leather.png)" }}
        >
          <div
            className="bg-stone-50 border border-neutral-200 rounded-sm p-8 sm:p-12"
            style={{ backgroundImage: "url(/patterns/paper.png)" }}
          >
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-600 mb-4">Our manifesto</h2>

            <div className="space-y-4 text-neutral-700 leading-relaxed">
              <p>
                We believe in the power of notetaking, not notetakers. Meetings should be moments of presence, not
                passive attendance. If you are not adding value, your time is better spent elsewhere for you and your
                team.
              </p>
              <p>
                Hyprnote exists to preserve what makes us human: conversations that spark ideas, collaborations that
                move work forward. We build tools that amplify human agency, not replace it. No ghost bots. No silent
                note lurkers. Just people, thinking together.
              </p>
              <p>We stand with those who value real connection and purposeful collaboration.</p>
            </div>

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

            <div className="space-y-4">
              <div>
                <p className="text-base text-neutral-600 font-medium italic font-serif">Hyprnote</p>
                <p className="text-sm text-neutral-500">John Jeong, Yujong Lee</p>
              </div>

              <div>
                <img
                  src="/hyprnote/signature-dark.svg"
                  alt="Hyprnote Signature"
                  className="w-32 h-auto opacity-80"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 border-t border-neutral-100 bg-linear-to-t from-stone-50/30 to-stone-100/30 px-4 laptop:px-0">
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
  );
}
