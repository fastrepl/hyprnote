import { Icon } from "@iconify-icon/react";

import { cn } from "@hypr/utils";

import { SlashSeparator } from "@/components/slash-separator";
import { competitors } from "@/data/vs-competitors";

interface VSTemplateProps {
  competitorIcon: string;
  competitorName: string;
  headline: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

export function createVSRoute(competitorKey: string) {
  const competitor = competitors[competitorKey];

  if (!competitor) {
    throw new Error(
      `Competitor "${competitorKey}" not found in competitors data`,
    );
  }

  const metaTitle = `Hyprnote vs ${competitor.name} - Privacy-First AI Notetaking`;

  return {
    component: () => (
      <VSTemplate
        competitorIcon={competitor.icon}
        competitorName={competitor.name}
        headline={competitor.headline}
        description={competitor.description}
        metaTitle={metaTitle}
        metaDescription={competitor.metaDescription}
      />
    ),
    head: () => ({
      meta: [
        { title: metaTitle },
        {
          name: "description",
          content: competitor.metaDescription,
        },
      ],
    }),
  };
}

export function VSTemplate({
  competitorIcon,
  competitorName,
  headline,
  description,
  metaTitle,
  metaDescription,
}: VSTemplateProps) {
  return (
    <div
      className="bg-linear-to-b from-white via-stone-50/20 to-white min-h-screen"
      style={{ backgroundImage: "url(/patterns/dots.svg)" }}
    >
      <div className="max-w-6xl mx-auto border-x border-neutral-100 bg-white">
        <HeroSection
          competitorIcon={competitorIcon}
          competitorName={competitorName}
          headline={headline}
          description={description}
        />
        <SlashSeparator />
        <PrivacySection />
        <SlashSeparator />
        <FeaturesSection />
        <SlashSeparator />
        <FlexibilitySection />
        <SlashSeparator />
        <CTASection />
      </div>
    </div>
  );
}

interface HeroSectionProps {
  competitorIcon: string;
  competitorName: string;
  headline: string;
  description: string;
}

function HeroSection({
  competitorIcon,
  competitorName,
  headline,
  description,
}: HeroSectionProps) {
  return (
    <div className="bg-linear-to-b from-stone-50/30 to-stone-100/30 px-6 py-12 lg:py-20">
      <header className="text-center max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <div className="size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent">
            <Icon icon={competitorIcon} className="text-[128px]" />
          </div>
          <div className="text-3xl sm:text-4xl text-neutral-400 font-light pl-6 pr-8">
            vs
          </div>
          <div className="size-40 shadow-2xl border border-neutral-100 flex justify-center items-center rounded-[48px] bg-transparent scale-110">
            <img
              src="https://ijoptyyjrfqwaqhyxkxj.supabase.co/storage/v1/object/public/public_images/hyprnote/icon.png"
              alt="Hyprnote"
              className="size-36 rounded-[40px] border border-neutral-100"
            />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight text-stone-600 mb-6">
          {headline}
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 mb-8">
          {description}
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
            Download Hyprnote for free
          </a>
        </div>
      </header>
    </div>
  );
}

function PrivacySection() {
  return (
    <section className="relative">
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Privacy First
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon icon="mdi:lock" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Local-first by default
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Your meetings are transcribed and summarized entirely on your
              device. No voice data leaves your computer unless you explicitly
              choose to sync.
            </p>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon
              icon="mdi:server-off"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              No mandatory cloud
            </h3>
            <p className="text-neutral-600 leading-relaxed">
              Unlike cloud-only solutions, Hyprnote works completely offline.
              Sync to your preferred cloud only when you want to—no forced
              uploads, no third-party servers processing your conversations.
            </p>
          </div>
        </div>

        <div className="p-8 border-t border-neutral-100">
          <Icon
            icon="mdi:shield-check"
            className="text-3xl text-stone-600 mb-4"
          />
          <h3 className="text-xl font-serif text-stone-600 mb-3">
            Compliance-ready
          </h3>
          <p className="text-neutral-600 leading-relaxed max-w-3xl">
            Perfect for healthcare, legal, and other compliance-sensitive
            environments. Keep your sensitive conversations private and meet
            HIPAA, GDPR, and other regulatory requirements with ease.
          </p>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="relative">
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Complete AI Notetaking
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-3">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon
              icon="mdi:text-box-outline"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-lg font-serif text-stone-600 mb-3">
              Realtime transcription
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Live transcription with speaker identification. Watch the
              conversation unfold in real-time without missing a word.
            </p>
          </div>

          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon
              icon="mdi:file-document-outline"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-lg font-serif text-stone-600 mb-3">
              Custom summaries
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Create customized summaries with templates. Sales calls, team
              standups, interviews—format it your way.
            </p>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon
              icon="mdi:chat-outline"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-lg font-serif text-stone-600 mb-3">
              AI assistant
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Ask questions during or after meetings. Get instant context-aware
              answers from your transcript and past conversations.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 border-t border-neutral-100">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon
              icon="mdi:text-box-edit-outline"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-lg font-serif text-stone-600 mb-3">
              Notion-like editor
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Full markdown support with a distraction-free writing experience.
              Take notes your way with a beautiful, powerful editor.
            </p>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon icon="mdi:magnify" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-lg font-serif text-stone-600 mb-3">
              Search everything
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Search across all your notes and transcripts instantly. Find any
              conversation, decision, or action item in seconds.
            </p>
          </div>
        </div>

        <div className="p-8 border-t border-neutral-100">
          <Icon
            icon="mdi:account-multiple-outline"
            className="text-3xl text-stone-600 mb-4"
          />
          <h3 className="text-lg font-serif text-stone-600 mb-3">
            Share and collaborate
          </h3>
          <p className="text-neutral-600 leading-relaxed max-w-3xl">
            Share notes with granular permissions. Send to Slack, Teams,
            Salesforce, or copy links. Keep your team aligned without switching
            tools.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlexibilitySection() {
  return (
    <section className="relative">
      <div className="text-center font-medium text-neutral-600 uppercase tracking-wide py-6 font-serif">
        Your Choice, Your Way
      </div>

      <div className="border-t border-neutral-100">
        <div className="grid md:grid-cols-2">
          <div className="p-8 border-b md:border-b-0 md:border-r border-neutral-100">
            <Icon icon="mdi:brain" className="text-3xl text-stone-600 mb-4" />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Use any AI model
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Not locked into a single AI provider. Choose from OpenAI,
              Anthropic, local models, or bring your own. Switch anytime.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Local AI for complete privacy
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Cloud models for more power
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Bring your own API keys
                </span>
              </li>
            </ul>
          </div>

          <div className="p-8 border-b md:border-b-0 border-neutral-100">
            <Icon
              icon="mdi:code-braces"
              className="text-3xl text-stone-600 mb-4"
            />
            <h3 className="text-xl font-serif text-stone-600 mb-3">
              Open source & extensible
            </h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              Hyprnote is fully open source. Build custom extensions, integrate
              with your tools, and shape it to your workflow.
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Full transparency—inspect the code
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Build your own extensions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon
                  icon="mdi:check"
                  className="text-stone-600 shrink-0 mt-0.5"
                />
                <span className="text-sm text-neutral-600">
                  Community-driven development
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
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
          Start using Hyprnote today
        </h2>
        <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
          Private, flexible, and powerful AI notetaking that works your way
        </p>
        <div className="pt-6">
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
        </div>
      </div>
    </section>
  );
}
